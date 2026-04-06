const db = require('../config/database');

// Instability score = (fail_pct * 0.5) + (blocked_pct * 0.5), 0-100
function instabilityScore(failPct, blockedPct) {
  return Math.round((failPct * 0.5 + blockedPct * 0.5) * 10) / 10;
}

function stabilityColor(score) {
  if (score <= 12) return 'green';
  if (score <= 25) return 'amber';
  return 'red';
}

// ── KPI summary ───────────────────────────────────────────────
async function getStabilityKpis() {
  const { rows } = await db.query(`
    SELECT
      e.env_name,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')
            / NULLIF(COUNT(*), 0), 1) AS blocked_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')
            / NULLIF(COUNT(*), 0), 1) AS fail_pct
    FROM fact_test_execution fte
    JOIN dim_environment e ON fte.env_id = e.env_id
    GROUP BY e.env_name
    ORDER BY env_name
  `);

  const scores = rows.map((r) => ({
    env:     r.env_name,
    blocked: parseFloat(r.blocked_pct),
    fail:    parseFloat(r.fail_pct),
    score:   instabilityScore(parseFloat(r.fail_pct), parseFloat(r.blocked_pct)),
  }));

  const worst  = scores.reduce((a, b) => a.score > b.score ? a : b);
  const best   = scores.reduce((a, b) => a.score < b.score ? a : b);
  const avgBlocked = Math.round(scores.reduce((s, e) => s + e.blocked, 0) / scores.length * 10) / 10;
  const sitScore   = scores.find((e) => e.env === 'SIT')?.score ?? 0;
  const prodScore  = scores.find((e) => e.env === 'PROD')?.score ?? 0;

  return {
    most_unstable_env: worst.env,
    most_stable_env:   best.env,
    avg_blocked_pct:   avgBlocked,
    sit_instability:   sitScore,
    prod_instability:  prodScore,
  };
}

// ── Environment summary table ────────────────────────────────
async function getEnvironmentSummary() {
  const { rows } = await db.query(`
    SELECT
      e.env_name,
      COUNT(*)                                                              AS total_execs,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'PASS')
            / NULLIF(COUNT(*), 0), 1)                                       AS pass_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')
            / NULLIF(COUNT(*), 0), 1)                                       AS fail_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')
            / NULLIF(COUNT(*), 0), 1)                                       AS blocked_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'IN_PROGRESS')
            / NULLIF(COUNT(*), 0), 1)                                       AS in_progress_pct
    FROM fact_test_execution fte
    JOIN dim_environment e ON fte.env_id = e.env_id
    GROUP BY e.env_name
    ORDER BY (
      100.0 * COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')
      / NULLIF(COUNT(*), 0) * 0.5
      +
      100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')
      / NULLIF(COUNT(*), 0) * 0.5
    ) DESC
  `);

  return {
    environments: rows.map((r) => {
      const fail    = parseFloat(r.fail_pct ?? 0);
      const blocked = parseFloat(r.blocked_pct ?? 0);
      const score   = instabilityScore(fail, blocked);
      return {
        env_name:        r.env_name,
        total_execs:     parseInt(r.total_execs),
        pass_pct:        parseFloat(r.pass_pct ?? 0),
        fail_pct:        fail,
        blocked_pct:     blocked,
        in_progress_pct: parseFloat(r.in_progress_pct ?? 0),
        instability_score: score,
        color:           stabilityColor(score),
      };
    }),
  };
}

// ── Weekly blocked % trend per environment ────────────────────
async function getEnvBlockedTrend() {
  const { rows } = await db.query(`
    WITH last_weeks AS (
      SELECT DISTINCT week_num, week_label
      FROM dim_date ORDER BY week_num DESC LIMIT 20
    )
    SELECT
      lw.week_num,
      lw.week_label,
      e.env_name,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')
        / NULLIF(COUNT(*), 0)
      , 1) AS blocked_pct
    FROM last_weeks lw
    JOIN dim_date dd ON dd.week_num = lw.week_num
    JOIN fact_test_execution fte ON fte.date_id = dd.date_id
    JOIN dim_environment e ON fte.env_id = e.env_id
    GROUP BY lw.week_num, lw.week_label, e.env_name
    ORDER BY lw.week_num, e.env_name
  `);

  const weekMap  = new Map();
  const envSet   = new Set();

  for (const r of rows) {
    envSet.add(r.env_name);
    if (!weekMap.has(r.week_num)) {
      weekMap.set(r.week_num, { label: r.week_label, data: {} });
    }
    weekMap.get(r.week_num).data[r.env_name] = parseFloat(r.blocked_pct ?? 0);
  }

  const sortedWeeks = [...weekMap.entries()].sort(([a], [b]) => a - b);
  const envs = ['DEV', 'SIT', 'UAT', 'PERF', 'PROD'].filter((e) => envSet.has(e));

  return {
    weeks: sortedWeeks.map(([, w]) => w.label),
    envs,
    data:  sortedWeeks.map(([, w]) => ({ week: w.label, ...w.data })),
  };
}

// ── Program × Environment blocked % cross-tab ─────────────────
async function getProgramEnvStability() {
  const { rows } = await db.query(`
    SELECT
      p.program_name,
      e.env_name,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')
            / NULLIF(COUNT(*), 0), 1)  AS blocked_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')
            / NULLIF(COUNT(*), 0), 1)  AS fail_pct,
      COUNT(*)                          AS total
    FROM fact_test_execution fte
    JOIN dim_program     p ON fte.program_id = p.program_id
    JOIN dim_environment e ON fte.env_id     = e.env_id
    GROUP BY p.program_name, e.env_name
    ORDER BY p.program_name, e.env_name
  `);

  const programs = [...new Set(rows.map((r) => r.program_name))].sort();
  const envs     = ['DEV', 'SIT', 'UAT', 'PERF', 'PROD'];
  const cellMap  = new Map(rows.map((r) => [`${r.program_name}:${r.env_name}`, r]));

  return {
    programs,
    envs,
    cells: rows.map((r) => ({
      program:     r.program_name,
      env:         r.env_name,
      blocked_pct: parseFloat(r.blocked_pct ?? 0),
      fail_pct:    parseFloat(r.fail_pct ?? 0),
      total:       parseInt(r.total),
      color:       stabilityColor(instabilityScore(
        parseFloat(r.fail_pct ?? 0),
        parseFloat(r.blocked_pct ?? 0)
      )),
    })),
    cellMap: null, // client builds its own map
  };
}

module.exports = {
  getStabilityKpis,
  getEnvironmentSummary,
  getEnvBlockedTrend,
  getProgramEnvStability,
};
