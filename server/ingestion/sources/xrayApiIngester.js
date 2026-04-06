require('dotenv').config();
const pLimit = require('p-limit');
const ups    = require('../upsertHelpers');
const cfg    = require('../config/xrayConfig');
const { transformExecution   } = require('../transformers/executionTransformer');
const { transformDefect      } = require('../transformers/defectTransformer');

const limit = pLimit(5);  // max 5 concurrent requests (Jira rate limit headroom)

// ── HTTP helpers ─────────────────────────────────────────────

async function apiFetch(url, retries = 3) {
  const auth = await cfg.getAuthHeader();
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: { Authorization: auth, 'Content-Type': 'application/json' } });
    if (res.status === 429) {
      const wait = Math.pow(2, attempt) * 1000;
      console.warn(`[xray] 429 rate limit — waiting ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    return res.json();
  }
  throw new Error(`Max retries exceeded for ${url}`);
}

async function fetchAllPages(buildUrl, dataKey = 'values') {
  const results = [];
  let page = 0;
  const limit_per_page = 50;
  while (true) {
    const data = await apiFetch(`${buildUrl(page, limit_per_page)}`);
    const items = Array.isArray(data) ? data : (data[dataKey] ?? data.results ?? []);
    results.push(...items);
    if (items.length < limit_per_page) break;
    page++;
  }
  return results;
}

// ── DB cache helpers (same pattern as xlsxIngester) ──────────

const db = require('../../config/database');
const cache = { releases: new Map(), programs: new Map(), envs: new Map(),
                apps: new Map(), tests: new Map(), reqs: new Map(), dates: new Map() };

async function loadCaches() {
  (await db.query('SELECT release_id, release_name FROM dim_release')).rows
    .forEach((r) => cache.releases.set(r.release_name, r.release_id));
  (await db.query('SELECT program_id, program_name FROM dim_program')).rows
    .forEach((r) => cache.programs.set(r.program_name, r.program_id));
  (await db.query('SELECT env_id, env_name FROM dim_environment')).rows
    .forEach((r) => cache.envs.set(r.env_name, r.env_id));
  (await db.query('SELECT app_id, app_name FROM dim_application')).rows
    .forEach((r) => cache.apps.set(r.app_name, r.app_id));
  (await db.query('SELECT test_id, test_key FROM dim_test')).rows
    .forEach((r) => cache.tests.set(r.test_key, r.test_id));
  (await db.query('SELECT date_id, full_date::text FROM dim_date')).rows
    .forEach((r) => cache.dates.set(r.full_date.slice(0, 10), r.date_id));
}

async function getOrCreate(cacheMap, table, pkCol, conflictCol, data, key) {
  if (cacheMap.has(key)) return cacheMap.get(key);
  const id = await ups.upsertDimension(table, pkCol, conflictCol, data);
  cacheMap.set(key, id);
  return id;
}

// ── Jira / Xray API calls ─────────────────────────────────────

async function fetchTestPlans() {
  const jql = encodeURIComponent(`issuetype = "Test Plan" AND project = "${cfg.PROJECT_KEY}" ORDER BY created DESC`);
  const url  = `${cfg.BASE_URL}/rest/api/3/search?jql=${jql}&fields=summary,fixVersions,status&maxResults=100`;
  const data = await apiFetch(url);
  return (data.issues ?? []).map((i) => ({
    release_name:  i.fields.fixVersions?.[0]?.name ?? i.fields.summary,
    release_date:  i.fields.fixVersions?.[0]?.releaseDate ?? null,
    status:        i.fields.status?.name === 'Done' ? 'Completed' : 'Active',
  }));
}

async function fetchTestExecutionIssues() {
  const jql = encodeURIComponent(`issuetype = "Test Execution" AND project = "${cfg.PROJECT_KEY}"`);
  const buildUrl = (page, lim) =>
    `${cfg.BASE_URL}/rest/api/3/search?jql=${jql}&fields=summary,fixVersions,customfield_10100&startAt=${page * lim}&maxResults=${lim}`;
  return fetchAllPages(buildUrl, 'issues');
}

async function fetchTestRuns(execIssueId) {
  if (cfg.isCloud) {
    const buildUrl = (page, lim) =>
      `${cfg.XRAY_CLOUD}/testexec/${execIssueId}/testruns?limit=${lim}&page=${page}`;
    return fetchAllPages(buildUrl, 'results');
  }
  const data = await apiFetch(`${cfg.BASE_URL}/rest/raven/1.0/api/testexec/${execIssueId}/test`);
  return Array.isArray(data) ? data : [];
}

async function fetchRequirements() {
  const jql = encodeURIComponent(`issuetype in (Story, Requirement, Epic) AND project = "${cfg.PROJECT_KEY}"`);
  const buildUrl = (page, lim) =>
    `${cfg.BASE_URL}/rest/api/3/search?jql=${jql}&fields=summary,priority,fixVersions,issuelinks&startAt=${page * lim}&maxResults=${lim}`;
  return fetchAllPages(buildUrl, 'issues');
}

async function fetchDefects() {
  const jql = encodeURIComponent(`issuetype = Bug AND project = "${cfg.PROJECT_KEY}"`);
  const buildUrl = (page, lim) =>
    `${cfg.BASE_URL}/rest/api/3/search?jql=${jql}&fields=summary,priority,status,created,resolutiondate,fixVersions,components&startAt=${page * lim}&maxResults=${lim}`;
  return fetchAllPages(buildUrl, 'issues');
}

// ── Main run ──────────────────────────────────────────────────

async function run(options = {}) {
  if (!cfg.BASE_URL) throw new Error('JIRA_BASE_URL not set');
  if (!cfg.PROJECT_KEY) throw new Error('JIRA_PROJECT_KEY not set');

  const stats = { inserted: 0, skipped: 0, errors: [] };
  const t0    = Date.now();

  console.log(`[xray] Starting ingestion (${cfg.isCloud ? 'Cloud' : 'Server/DC'} mode)`);
  await loadCaches();

  // Step 1: Releases from Test Plans
  console.log('[xray] Step 1: Test Plans → dim_release');
  const plans = await fetchTestPlans();
  for (const p of plans) {
    if (!p.release_name) continue;
    const id = await ups.upsertDimension('dim_release', 'release_id', 'release_name', {
      release_name: p.release_name, release_date: p.release_date, status: p.status,
    });
    cache.releases.set(p.release_name, id);
    stats.inserted++;
  }

  // Step 2: Test Execution issues → dim_test + fact_test_execution
  console.log('[xray] Step 2: Test Executions + runs → fact_test_execution');
  const execIssues = await fetchTestExecutionIssues();
  await Promise.all(execIssues.map((issue) => limit(async () => {
    try {
      const runs = await fetchTestRuns(issue.id);
      for (const run of runs) {
        const testKey    = run.testKey  || run.key || issue.key;
        const envName    = run.environments?.[0] || 'DEV';
        const releaseName = issue.fields?.fixVersions?.[0]?.name;
        const execDate   = (run.startedOn || run.finishedOn || new Date().toISOString()).slice(0, 10);
        const status     = transformExecution({ 'Execution Status': run.status || run.executionStatus }).status;

        const testId = await getOrCreate(cache.tests, 'dim_test', 'test_id', 'test_key',
          { test_key: testKey, test_summary: run.summary || '', test_type: 'Manual', priority: 'Medium' }, testKey);
        const relId = releaseName
          ? await getOrCreate(cache.releases, 'dim_release', 'release_id', 'release_name',
              { release_name: releaseName, status: 'Active' }, releaseName)
          : null;
        const envId = await getOrCreate(cache.envs, 'dim_environment', 'env_id', 'env_name',
          { env_name: envName.toUpperCase() }, envName);
        const dateId = await getOrCreate(cache.dates, 'dim_date', 'date_id', 'full_date', {
          full_date: execDate, week_num: 1, month_num: new Date(execDate).getMonth() + 1,
          year: new Date(execDate).getFullYear(), week_label: 'W1',
        }, execDate);
        // Use first program and app as fallback
        const programId = [...cache.programs.values()][0];
        const appId     = [...cache.apps.values()][0];

        if (!testId || !relId || !envId || !dateId || !programId || !appId) {
          stats.skipped++; return;
        }
        await ups.upsertExecution({ test_id: testId, release_id: relId, program_id: programId,
          env_id: envId, app_id: appId, date_id: dateId, status, execution_date: execDate });
        stats.inserted++;
      }
    } catch (err) { stats.errors.push(err.message); stats.skipped++; }
  })));

  // Step 3: Requirements + coverage
  console.log('[xray] Step 3: Requirements → dim_requirement + fact_requirement_coverage');
  const requirements = await fetchRequirements();
  for (const issue of requirements) {
    try {
      const reqKey  = issue.key;
      const pri     = issue.fields?.priority?.name ?? 'Medium';
      const relName = issue.fields?.fixVersions?.[0]?.name;
      const reqId   = await ups.upsertDimension('dim_requirement', 'req_id', 'req_key', {
        req_key: reqKey, req_summary: issue.fields?.summary ?? '', priority: pri,
      });
      cache.reqs.set(reqKey, reqId);

      // Coverage via issuelinks
      const linkedTests = (issue.fields?.issuelinks ?? [])
        .filter((l) => l.inwardIssue?.fields?.issuetype?.name === 'Test')
        .map((l) => l.inwardIssue.key);
      if (linkedTests.length && relName && cache.releases.has(relName)) {
        for (const testKey of linkedTests) {
          const testId = cache.tests.get(testKey);
          if (testId) {
            await ups.upsertCoverage({ req_id: reqId, test_id: testId,
              release_id: cache.releases.get(relName), is_covered: true });
          }
        }
      }
      stats.inserted++;
    } catch (err) { stats.errors.push(err.message); stats.skipped++; }
  }

  // Step 4: Defects
  console.log('[xray] Step 4: Bugs → fact_defect');
  const defects = await fetchDefects();
  for (const issue of defects) {
    try {
      const t = transformDefect({
        'Fix Version':   issue.fields?.fixVersions?.[0]?.name,
        'Program':       issue.fields?.components?.[0]?.name,
        'Priority':      issue.fields?.priority?.name,
        'Status':        issue.fields?.status?.name,
        'Created':       issue.fields?.created,
        'Resolved':      issue.fields?.resolutiondate,
      });
      const relId  = t.release_name ? cache.releases.get(t.release_name) : null;
      const progId = t.program_name ? cache.programs.get(t.program_name) : [...cache.programs.values()][0];
      if (!relId || !progId) { stats.skipped++; continue; }
      await ups.upsertDefect({ release_id: relId, program_id: progId,
        severity: t.severity, status: t.status,
        created_date: t.created_date, resolved_date: t.resolved_date });
      stats.inserted++;
    } catch (err) { stats.errors.push(err.message); stats.skipped++; }
  }

  // Step 5: Rebuild weekly metrics
  console.log('[xray] Step 5: Rebuilding weekly metrics…');
  await ups.rebuildWeeklyMetrics();

  const summary = {
    source: 'xray', inserted: stats.inserted, skipped: stats.skipped,
    errors: stats.errors.slice(0, 20), duration_ms: Date.now() - t0,
  };
  console.log(`[xray] Done: ${summary.inserted} inserted, ${summary.skipped} skipped in ${summary.duration_ms}ms`);
  return summary;
}

module.exports = { run };
