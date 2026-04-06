require('dotenv').config();
const path  = require('path');
const XLSX  = require('xlsx');
const db    = require('../../config/database');
const ups   = require('../upsertHelpers');
const { transformExecution   } = require('../transformers/executionTransformer');
const { transformRequirement } = require('../transformers/requirementTransformer');
const { transformDefect      } = require('../transformers/defectTransformer');
const { transformRelease     } = require('../transformers/releaseTransformer');

// Cache of dimension IDs to avoid redundant DB hits
const cache = {
  releases: new Map(), programs: new Map(), envs: new Map(),
  apps: new Map(), tests: new Map(), reqs: new Map(), dates: new Map(),
};

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
  (await db.query('SELECT req_id, req_key FROM dim_requirement')).rows
    .forEach((r) => cache.reqs.set(r.req_key, r.req_id));
  (await db.query('SELECT date_id, full_date::text AS full_date FROM dim_date')).rows
    .forEach((r) => cache.dates.set(r.full_date.slice(0, 10), r.date_id));
}

async function getOrCreateTest(testKey) {
  if (!testKey) return null;
  if (cache.tests.has(testKey)) return cache.tests.get(testKey);
  const id = await ups.upsertDimension('dim_test', 'test_id', 'test_key', {
    test_key: testKey, test_summary: `Imported: ${testKey}`,
    test_type: 'Manual', priority: 'Medium',
  });
  cache.tests.set(testKey, id);
  return id;
}

async function getOrCreateRelease(releaseName) {
  if (!releaseName) return null;
  if (cache.releases.has(releaseName)) return cache.releases.get(releaseName);
  const id = await ups.upsertDimension('dim_release', 'release_id', 'release_name', {
    release_name: releaseName, status: 'Active',
  });
  cache.releases.set(releaseName, id);
  return id;
}

async function getOrCreateProgram(programName) {
  if (!programName) return null;
  if (cache.programs.has(programName)) return cache.programs.get(programName);
  const id = await ups.upsertDimension('dim_program', 'program_id', 'program_name', {
    program_name: programName,
  });
  cache.programs.set(programName, id);
  return id;
}

async function getOrCreateApp(appName, programId) {
  if (!appName) return null;
  if (cache.apps.has(appName)) return cache.apps.get(appName);
  const id = await ups.upsertDimension('dim_application', 'app_id', 'app_name', {
    app_name: appName, program_id: programId,
  });
  cache.apps.set(appName, id);
  return id;
}

async function getOrCreateEnv(envName) {
  if (!envName) return null;
  if (cache.envs.has(envName)) return cache.envs.get(envName);
  const id = await ups.upsertDimension('dim_environment', 'env_id', 'env_name', {
    env_name: envName.toUpperCase(),
  });
  cache.envs.set(envName, id);
  return id;
}

async function getOrCreateDate(dateStr) {
  if (!dateStr) return null;
  const key = dateStr.slice(0, 10);
  if (cache.dates.has(key)) return cache.dates.get(key);
  const d = new Date(key);
  const base = new Date('2024-01-01');
  const weekNum = Math.floor((d - base) / (7 * 86400000)) + 1;
  const id = await ups.upsertDimension('dim_date', 'date_id', 'full_date', {
    full_date: key, week_num: weekNum,
    month_num: d.getMonth() + 1, year: d.getFullYear(),
    week_label: `W${weekNum}`,
  });
  cache.dates.set(key, id);
  return id;
}

// ── Sheet processors ─────────────────────────────────────────

async function processExecutions(rows, stats) {
  for (const row of rows) {
    try {
      const t = transformExecution(row);
      const [testId, releaseId, programId, envId, dateId] = await Promise.all([
        getOrCreateTest(t.test_key),
        getOrCreateRelease(t.release_name),
        getOrCreateProgram(t.program_name),
        getOrCreateEnv(t.env_name),
        getOrCreateDate(t.execution_date),
      ]);
      const appId = await getOrCreateApp(t.app_name, programId);
      if (!testId || !releaseId || !programId || !envId || !appId || !dateId) {
        stats.skipped++; continue;
      }
      await ups.upsertExecution({ test_id: testId, release_id: releaseId, program_id: programId,
        env_id: envId, app_id: appId, date_id: dateId, status: t.status, execution_date: t.execution_date });
      stats.inserted++;
    } catch (err) { stats.errors.push(err.message); stats.skipped++; }
  }
}

async function processRequirements(rows, stats) {
  for (const row of rows) {
    try {
      const t = transformRequirement(row);
      if (!t.req_key) { stats.skipped++; continue; }
      const reqId = await ups.upsertDimension('dim_requirement', 'req_id', 'req_key', {
        req_key: t.req_key, req_summary: t.req_summary, priority: t.priority,
      });
      cache.reqs.set(t.req_key, reqId);
      if (t.test_key && t.release_name) {
        const [testId, releaseId] = await Promise.all([
          getOrCreateTest(t.test_key), getOrCreateRelease(t.release_name),
        ]);
        if (testId && releaseId) {
          await ups.upsertCoverage({ req_id: reqId, test_id: testId,
            release_id: releaseId, is_covered: t.is_covered });
        }
      }
      stats.inserted++;
    } catch (err) { stats.errors.push(err.message); stats.skipped++; }
  }
}

async function processDefects(rows, stats) {
  for (const row of rows) {
    try {
      const t = transformDefect(row);
      const [releaseId, programId] = await Promise.all([
        getOrCreateRelease(t.release_name), getOrCreateProgram(t.program_name),
      ]);
      if (!releaseId || !programId) { stats.skipped++; continue; }
      await ups.upsertDefect({ release_id: releaseId, program_id: programId,
        severity: t.severity, status: t.status,
        created_date: t.created_date, resolved_date: t.resolved_date });
      stats.inserted++;
    } catch (err) { stats.errors.push(err.message); stats.skipped++; }
  }
}

async function processReleases(rows, stats) {
  for (const row of rows) {
    try {
      const t = transformRelease(row);
      if (!t.release_name) { stats.skipped++; continue; }
      await ups.upsertDimension('dim_release', 'release_id', 'release_name', {
        release_name: t.release_name, release_version: t.release_version,
        release_date: t.release_date, status: t.status,
      });
      stats.inserted++;
    } catch (err) { stats.errors.push(err.message); stats.skipped++; }
  }
}

// ── Sheet name detection ──────────────────────────────────────

const SHEET_HANDLERS = [
  { pattern: /exec/i,       handler: processExecutions    },
  { pattern: /req/i,        handler: processRequirements  },
  { pattern: /defect|bug/i, handler: processDefects       },
  { pattern: /release|plan/i, handler: processReleases    },
];

function detectHandler(sheetName) {
  for (const { pattern, handler } of SHEET_HANDLERS) {
    if (pattern.test(sheetName)) return handler;
  }
  return null;
}

// ── Main run ──────────────────────────────────────────────────

async function run(options = {}) {
  const DEFAULT_XLSX = path.resolve(__dirname, '../../../Xray_TestMetrics_PBI_BuildPack_2.xlsx');
  const filePath = options.filePath || process.env.XLSX_FILE_PATH || DEFAULT_XLSX;
  if (!filePath) throw new Error('XLSX_FILE_PATH not set');

  const absPath = path.resolve(filePath);
  console.log(`[xlsx] Reading ${absPath}`);

  const wb    = XLSX.readFile(absPath, { cellDates: true });
  const stats = { inserted: 0, skipped: 0, errors: [] };
  const t0    = Date.now();

  await loadCaches();

  for (const sheetName of wb.SheetNames) {
    const handler = detectHandler(sheetName);
    if (!handler) { console.log(`[xlsx] Skipping sheet: ${sheetName}`); continue; }

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    console.log(`[xlsx] Processing sheet "${sheetName}" (${rows.length} rows)…`);
    await handler(rows, stats);
  }

  console.log('[xlsx] Rebuilding weekly metrics…');
  await ups.rebuildWeeklyMetrics();

  const summary = {
    source:     'xlsx',
    inserted:   stats.inserted,
    skipped:    stats.skipped,
    errors:     stats.errors.slice(0, 20),
    duration_ms: Date.now() - t0,
  };
  console.log(`[xlsx] Done: ${summary.inserted} inserted, ${summary.skipped} skipped in ${summary.duration_ms}ms`);
  return summary;
}

module.exports = { run };
