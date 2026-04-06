const db = require('../config/database');

// ── Per-release KPI summary ───────────────────────────────────

async function getReleaseSummaryById(releaseId) {
  const { rows: [row] } = await db.query(`
    SELECT
      r.release_id,
      r.release_name,
      r.release_date,
      r.status,
      v.rri_score,
      v.pass_rate,
      v.fail_rate,
      v.blocked_rate,
      v.coverage_pct,
      v.total_executions,
      COALESCE(
        (SELECT COUNT(*) FROM fact_defect fd
         WHERE fd.release_id = r.release_id
           AND fd.severity = 'Critical'
           AND fd.status IN ('Open', 'In Progress')),
        0
      ) AS open_critical,
      COALESCE(
        (SELECT COUNT(*) FROM fact_defect fd
         WHERE fd.release_id = r.release_id),
        0
      ) AS total_defects
    FROM dim_release r
    JOIN v_rri v ON r.release_id = v.release_id
    WHERE r.release_id = $1
  `, [releaseId]);

  if (!row) return null;

  return {
    release_id:       row.release_id,
    release_name:     row.release_name,
    release_date:     row.release_date,
    status:           row.status,
    rri:              parseFloat(row.rri_score   ?? 0),
    pass_pct:         parseFloat(row.pass_rate   ?? 0),
    fail_pct:         parseFloat(row.fail_rate   ?? 0),
    blocked_pct:      parseFloat(row.blocked_rate ?? 0),
    coverage_pct:     parseFloat(row.coverage_pct ?? 0),
    total_executions: parseInt(row.total_executions ?? 0),
    open_critical:    parseInt(row.open_critical ?? 0),
    total_defects:    parseInt(row.total_defects ?? 0),
  };
}

// ── Execution breakdown: program × environment ────────────────

async function getReleaseBreakdown(releaseId) {
  const { rows } = await db.query(`
    SELECT
      es.program_name,
      es.env_name,
      SUM(es.total_executions)::int AS total,
      SUM(es.passed)::int           AS passed,
      SUM(es.failed)::int           AS failed,
      SUM(es.blocked)::int          AS blocked,
      ROUND(100.0 * SUM(es.passed)  / NULLIF(SUM(es.total_executions), 0), 1) AS pass_pct,
      ROUND(100.0 * SUM(es.failed)  / NULLIF(SUM(es.total_executions), 0), 1) AS fail_pct,
      ROUND(100.0 * SUM(es.blocked) / NULLIF(SUM(es.total_executions), 0), 1) AS blocked_pct
    FROM v_execution_summary es
    WHERE es.release_id = $1
    GROUP BY es.program_name, es.env_name
    ORDER BY es.program_name, es.env_name
  `, [releaseId]);

  const programs     = [...new Set(rows.map((r) => r.program_name))].sort();
  const environments = ['DEV', 'SIT', 'UAT', 'PERF', 'PROD'];

  const cells = rows.map((r) => ({
    program:     r.program_name,
    env:         r.env_name,
    total:       r.total,
    passed:      r.passed,
    failed:      r.failed,
    blocked:     r.blocked,
    pass_pct:    parseFloat(r.pass_pct   ?? 0),
    fail_pct:    parseFloat(r.fail_pct   ?? 0),
    blocked_pct: parseFloat(r.blocked_pct ?? 0),
  }));

  return { programs, environments, cells };
}

// ── Weekly pass-rate trend for one release ────────────────────

async function getReleaseTrend(releaseId) {
  const { rows } = await db.query(`
    SELECT
      dd.week_num,
      dd.week_label,
      ROUND(AVG(fwm.pass_rate), 1) AS pass_rate
    FROM fact_weekly_metrics fwm
    JOIN dim_date dd ON fwm.date_id = dd.date_id
    WHERE fwm.release_id = $1
    GROUP BY dd.week_num, dd.week_label
    ORDER BY dd.week_num
  `, [releaseId]);

  return {
    labels: rows.map((r) => r.week_label),
    values: rows.map((r) => parseFloat(r.pass_rate)),
  };
}

// ── Defect list for one release ───────────────────────────────

async function getReleaseDefects(releaseId) {
  const { rows } = await db.query(`
    SELECT
      fd.defect_id,
      p.program_name,
      fd.severity,
      fd.status,
      fd.created_date,
      fd.resolved_date,
      (CURRENT_DATE - fd.created_date) AS age_days
    FROM fact_defect fd
    JOIN dim_program p ON fd.program_id = p.program_id
    WHERE fd.release_id = $1
    ORDER BY
      CASE fd.severity
        WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
        WHEN 'Medium'   THEN 3 ELSE 4
      END,
      fd.created_date DESC
  `, [releaseId]);

  return {
    defects: rows.map((r) => ({
      id:           r.defect_id,
      program:      r.program_name,
      severity:     r.severity,
      status:       r.status,
      created_date: r.created_date?.toISOString().slice(0, 10) ?? null,
      resolved_date: r.resolved_date?.toISOString().slice(0, 10) ?? null,
      age_days:     parseInt(r.age_days ?? 0),
    })),
  };
}

module.exports = {
  getReleaseSummaryById,
  getReleaseBreakdown,
  getReleaseTrend,
  getReleaseDefects,
};
