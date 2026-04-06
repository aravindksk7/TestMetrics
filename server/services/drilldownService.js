const db = require('../config/database');
const { buildWhereClause, buildViewWhereClause } = require('../utils/queryBuilder');

// ── KPI summary ───────────────────────────────────────────────
async function getDrilldownKpis(filters) {
  const { clause, params } = buildWhereClause(filters);

  const { rows: [totals] } = await db.query(`
    SELECT
      COUNT(*)                                                              AS total_execs,
      COUNT(DISTINCT fte.test_id)                                           AS unique_tests,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')
            / NULLIF(COUNT(*), 0), 1)                                       AS fail_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')
            / NULLIF(COUNT(*), 0), 1)                                       AS blocked_pct,
      COUNT(DISTINCT fte.test_id) FILTER (
        WHERE t.test_type IN ('Automated','Cucumber')
      )                                                                     AS automated_tests
    FROM fact_test_execution fte
    JOIN dim_test t  ON fte.test_id = t.test_id
    JOIN dim_date dd ON fte.date_id = dd.date_id
    WHERE 1=1 ${clause}
  `, params);

  const unique    = parseInt(totals.unique_tests ?? 0);
  const automated = parseInt(totals.automated_tests ?? 0);

  return {
    total_execs:    parseInt(totals.total_execs ?? 0),
    unique_tests:   unique,
    fail_pct:       parseFloat(totals.fail_pct    ?? 0),
    blocked_pct:    parseFloat(totals.blocked_pct ?? 0),
    automation_pct: unique > 0 ? Math.round(automated / unique * 1000) / 10 : 0,
  };
}

// ── Top failing tests ─────────────────────────────────────────
async function getTopFailingTests(filters) {
  const { clause, params } = buildWhereClause(filters);

  const { rows } = await db.query(`
    SELECT
      t.test_key,
      t.test_type,
      t.priority,
      COUNT(*)                                                AS total_execs,
      COUNT(*) FILTER (WHERE fte.status = 'FAIL')            AS failures,
      COUNT(*) FILTER (WHERE fte.status = 'PASS')            AS passes,
      COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')         AS blocked,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')
        / NULLIF(COUNT(*), 0)
      , 1)                                                    AS fail_rate,
      STRING_AGG(DISTINCT p.program_name, ', ')               AS programs,
      COUNT(DISTINCT fte.env_id)                              AS envs_count,
      COUNT(DISTINCT fte.release_id)                          AS releases_count
    FROM fact_test_execution fte
    JOIN dim_test    t  ON fte.test_id    = t.test_id
    JOIN dim_program p  ON fte.program_id = p.program_id
    JOIN dim_date    dd ON fte.date_id    = dd.date_id
    WHERE fte.status = 'FAIL' OR 1=1 ${clause === '' ? '' : 'AND 1=1 ' + clause}
    GROUP BY t.test_id, t.test_key, t.test_type, t.priority
    HAVING COUNT(*) FILTER (WHERE fte.status = 'FAIL') > 0
    ORDER BY fail_rate DESC, failures DESC
    LIMIT 30
  `, params);

  return {
    tests: rows.map((r) => ({
      test_key:       r.test_key,
      test_type:      r.test_type,
      priority:       r.priority,
      total_execs:    parseInt(r.total_execs),
      failures:       parseInt(r.failures),
      passes:         parseInt(r.passes),
      blocked:        parseInt(r.blocked),
      fail_rate:      parseFloat(r.fail_rate ?? 0),
      programs:       r.programs,
      envs_count:     parseInt(r.envs_count),
      releases_count: parseInt(r.releases_count),
    })),
  };
}

// ── Flaky tests ───────────────────────────────────────────────
async function getFlakyTests(filters) {
  const { clause, params } = buildWhereClause(filters);

  const { rows } = await db.query(`
    SELECT
      t.test_key,
      t.test_type,
      t.priority,
      COUNT(*)                                                AS total_execs,
      COUNT(*) FILTER (WHERE fte.status = 'PASS')            AS passes,
      COUNT(*) FILTER (WHERE fte.status = 'FAIL')            AS failures,
      COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')         AS blocked_count,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')
        / NULLIF(COUNT(*), 0)
      , 1)                                                    AS fail_rate,
      STRING_AGG(DISTINCT e.env_name, ', ')                  AS environments
    FROM fact_test_execution fte
    JOIN dim_test        t  ON fte.test_id = t.test_id
    JOIN dim_environment e  ON fte.env_id  = e.env_id
    JOIN dim_date        dd ON fte.date_id = dd.date_id
    WHERE fte.test_id IN (
      SELECT test_id FROM (
        SELECT test_id, release_id, env_id
        FROM fact_test_execution
        GROUP BY test_id, release_id, env_id
        HAVING COUNT(*) FILTER (WHERE status = 'PASS') > 0
           AND COUNT(*) FILTER (WHERE status = 'FAIL') > 0
      ) x
    )
    ${clause ? 'AND 1=1 ' + clause : ''}
    GROUP BY t.test_id, t.test_key, t.test_type, t.priority
    ORDER BY fail_rate DESC, total_execs DESC
    LIMIT 25
  `, params);

  return {
    tests: rows.map((r) => ({
      test_key:      r.test_key,
      test_type:     r.test_type,
      priority:      r.priority,
      total_execs:   parseInt(r.total_execs),
      passes:        parseInt(r.passes),
      failures:      parseInt(r.failures),
      blocked_count: parseInt(r.blocked_count),
      fail_rate:     parseFloat(r.fail_rate ?? 0),
      environments:  r.environments,
    })),
  };
}

// ── Recent executions log ─────────────────────────────────────
async function getRecentExecutions(filters) {
  const { clause, params } = buildWhereClause(filters);

  const { rows } = await db.query(`
    SELECT
      t.test_key,
      t.test_type,
      t.priority,
      p.program_name,
      e.env_name,
      r.release_name,
      fte.status,
      fte.execution_date
    FROM fact_test_execution fte
    JOIN dim_test        t  ON fte.test_id    = t.test_id
    JOIN dim_program     p  ON fte.program_id = p.program_id
    JOIN dim_environment e  ON fte.env_id     = e.env_id
    JOIN dim_release     r  ON fte.release_id = r.release_id
    JOIN dim_date        dd ON fte.date_id    = dd.date_id
    WHERE 1=1 ${clause}
    ORDER BY fte.execution_date DESC, fte.exec_id DESC
    LIMIT 100
  `, params);

  return {
    executions: rows.map((r) => ({
      test_key:       r.test_key,
      test_type:      r.test_type,
      priority:       r.priority,
      program_name:   r.program_name,
      env_name:       r.env_name,
      release_name:   r.release_name,
      status:         r.status,
      execution_date: r.execution_date?.toISOString?.().slice(0, 10) ?? r.execution_date,
    })),
  };
}

// ── Test type summary (pass/fail/blocked by type) ─────────────
async function getTestTypeSummary(filters) {
  const { clause, params } = buildWhereClause(filters);

  const { rows } = await db.query(`
    SELECT
      t.test_type,
      COUNT(*)                                                AS total,
      COUNT(*) FILTER (WHERE fte.status = 'PASS')            AS passed,
      COUNT(*) FILTER (WHERE fte.status = 'FAIL')            AS failed,
      COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')         AS blocked,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'PASS')
            / NULLIF(COUNT(*), 0), 1)                         AS pass_pct
    FROM fact_test_execution fte
    JOIN dim_test t  ON fte.test_id = t.test_id
    JOIN dim_date dd ON fte.date_id = dd.date_id
    WHERE 1=1 ${clause}
    GROUP BY t.test_type
    ORDER BY pass_pct ASC
  `, params);

  return {
    types: rows.map((r) => ({
      test_type: r.test_type,
      total:     parseInt(r.total),
      passed:    parseInt(r.passed),
      failed:    parseInt(r.failed),
      blocked:   parseInt(r.blocked),
      pass_pct:  parseFloat(r.pass_pct ?? 0),
    })),
  };
}

module.exports = {
  getDrilldownKpis,
  getTopFailingTests,
  getFlakyTests,
  getRecentExecutions,
  getTestTypeSummary,
};
