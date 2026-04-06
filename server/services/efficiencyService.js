const db = require('../config/database');

// ── KPI summary ───────────────────────────────────────────────
async function getEfficiencyKpis() {
  const { rows: [totals] } = await db.query(`
    SELECT
      COUNT(*)                                                                AS total_executions,
      ROUND(COUNT(*) / NULLIF(COUNT(DISTINCT dd.week_num), 0), 0)            AS avg_per_week,
      COUNT(DISTINCT fte.test_id) FILTER (
        WHERE t.test_type IN ('Automated','Cucumber')
      )                                                                       AS automated_tests,
      COUNT(DISTINCT fte.test_id)                                             AS total_tests
    FROM fact_test_execution fte
    JOIN dim_test t  ON fte.test_id  = t.test_id
    JOIN dim_date dd ON fte.date_id  = dd.date_id
  `);

  const { rows: [flaky] } = await db.query(`
    SELECT COUNT(*) AS flaky_count FROM (
      SELECT test_id, release_id, env_id
      FROM fact_test_execution
      GROUP BY test_id, release_id, env_id
      HAVING COUNT(*) FILTER (WHERE status = 'PASS') > 0
         AND COUNT(*) FILTER (WHERE status = 'FAIL') > 0
    ) x
  `);

  const { rows: [reruns] } = await db.query(`
    SELECT
      SUM(runs - 1) AS rerun_count,
      COUNT(*)      AS combos_with_reruns
    FROM (
      SELECT test_id, release_id, env_id, COUNT(*) AS runs
      FROM fact_test_execution
      GROUP BY test_id, release_id, env_id
      HAVING COUNT(*) > 1
    ) x
  `);

  const totalTests    = parseInt(totals.total_tests     ?? 0);
  const automatedTests = parseInt(totals.automated_tests ?? 0);

  return {
    total_executions:  parseInt(totals.total_executions ?? 0),
    avg_per_week:      parseInt(totals.avg_per_week ?? 0),
    automation_pct:    totalTests > 0 ? Math.round(automatedTests / totalTests * 1000) / 10 : 0,
    flaky_tests:       parseInt(flaky.flaky_count ?? 0),
    rerun_count:       parseInt(reruns.rerun_count ?? 0),
  };
}

// ── Weekly throughput trend ───────────────────────────────────
async function getThroughputTrend() {
  const { rows } = await db.query(`
    SELECT
      dd.week_num,
      dd.week_label,
      COUNT(*)                                                 AS total,
      COUNT(*) FILTER (WHERE t.test_type = 'Automated')       AS automated,
      COUNT(*) FILTER (WHERE t.test_type = 'Cucumber')        AS cucumber,
      COUNT(*) FILTER (WHERE t.test_type = 'Manual')          AS manual,
      COUNT(*) FILTER (WHERE t.test_type = 'Generic')         AS generic
    FROM fact_test_execution fte
    JOIN dim_test t  ON fte.test_id = t.test_id
    JOIN dim_date dd ON fte.date_id = dd.date_id
    GROUP BY dd.week_num, dd.week_label
    ORDER BY dd.week_num
  `);

  return {
    labels:    rows.map((r) => r.week_label),
    total:     rows.map((r) => parseInt(r.total)),
    automated: rows.map((r) => parseInt(r.automated)),
    cucumber:  rows.map((r) => parseInt(r.cucumber)),
    manual:    rows.map((r) => parseInt(r.manual)),
    generic:   rows.map((r) => parseInt(r.generic)),
  };
}

// ── Automation split (donut data) ─────────────────────────────
async function getAutomationSplit() {
  const { rows } = await db.query(`
    SELECT
      t.test_type,
      COUNT(DISTINCT fte.test_id) AS test_count,
      COUNT(fte.exec_id)          AS exec_count
    FROM fact_test_execution fte
    JOIN dim_test t ON fte.test_id = t.test_id
    GROUP BY t.test_type
    ORDER BY exec_count DESC
  `);

  return {
    types: rows.map((r) => r.test_type),
    test_counts: rows.map((r) => parseInt(r.test_count)),
    exec_counts: rows.map((r) => parseInt(r.exec_count)),
  };
}

// ── Flaky / churning tests ────────────────────────────────────
async function getFlakyTests() {
  const { rows } = await db.query(`
    SELECT
      t.test_key,
      t.test_type,
      t.priority,
      COUNT(*)                                       AS total_execs,
      COUNT(*) FILTER (WHERE fte.status = 'PASS')   AS pass_count,
      COUNT(*) FILTER (WHERE fte.status = 'FAIL')   AS fail_count,
      COUNT(DISTINCT fte.release_id)                 AS releases_affected,
      COUNT(DISTINCT fte.env_id)                     AS envs_affected
    FROM fact_test_execution fte
    JOIN dim_test t ON fte.test_id = t.test_id
    WHERE fte.test_id IN (
      SELECT test_id FROM (
        SELECT test_id, release_id, env_id
        FROM fact_test_execution
        GROUP BY test_id, release_id, env_id
        HAVING COUNT(*) FILTER (WHERE status = 'PASS') > 0
           AND COUNT(*) FILTER (WHERE status = 'FAIL') > 0
      ) x
    )
    GROUP BY t.test_id, t.test_key, t.test_type, t.priority
    ORDER BY (COUNT(*) FILTER (WHERE fte.status = 'FAIL'))::float
             / NULLIF(COUNT(*), 0) DESC
    LIMIT 25
  `);

  return {
    tests: rows.map((r) => ({
      test_key:          r.test_key,
      test_type:         r.test_type,
      priority:          r.priority,
      total_execs:       parseInt(r.total_execs),
      pass_count:        parseInt(r.pass_count),
      fail_count:        parseInt(r.fail_count),
      fail_rate:         parseFloat(((r.fail_count / r.total_execs) * 100).toFixed(1)),
      releases_affected: parseInt(r.releases_affected),
      envs_affected:     parseInt(r.envs_affected),
    })),
  };
}

module.exports = { getEfficiencyKpis, getThroughputTrend, getAutomationSplit, getFlakyTests };
