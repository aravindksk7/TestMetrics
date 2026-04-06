const db = require('../config/database');

function healthColor(passPct) {
  if (passPct >= 80) return 'green';
  if (passPct >= 60) return 'amber';
  return 'red';
}

// ── Program-level health summary ──────────────────────────────
async function getProgramHealth() {
  const { rows } = await db.query(`
    SELECT
      p.program_id,
      p.program_name,
      COUNT(fte.exec_id)                                                         AS total_executions,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'PASS')
            / NULLIF(COUNT(*), 0), 1)                                            AS pass_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')
            / NULLIF(COUNT(*), 0), 1)                                            AS fail_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')
            / NULLIF(COUNT(*), 0), 1)                                            AS blocked_pct,
      (SELECT COUNT(*) FROM fact_defect fd
       WHERE fd.program_id = p.program_id
         AND fd.severity   = 'Critical'
         AND fd.status     IN ('Open','In Progress'))                            AS open_critical,
      (SELECT COUNT(*) FROM fact_defect fd
       WHERE fd.program_id = p.program_id
         AND fd.status     IN ('Open','In Progress'))                            AS open_defects,
      (SELECT COUNT(*) FROM fact_defect fd
       WHERE fd.program_id = p.program_id)                                       AS total_defects
    FROM fact_test_execution fte
    JOIN dim_program p ON fte.program_id = p.program_id
    GROUP BY p.program_id, p.program_name
    ORDER BY pass_pct DESC
  `);

  const programs = rows.map((r) => ({
    program_id:       r.program_id,
    program_name:     r.program_name,
    total_executions: parseInt(r.total_executions),
    pass_pct:         parseFloat(r.pass_pct ?? 0),
    fail_pct:         parseFloat(r.fail_pct ?? 0),
    blocked_pct:      parseFloat(r.blocked_pct ?? 0),
    open_critical:    parseInt(r.open_critical ?? 0),
    open_defects:     parseInt(r.open_defects ?? 0),
    total_defects:    parseInt(r.total_defects ?? 0),
    health:           healthColor(parseFloat(r.pass_pct ?? 0)),
  }));

  const totals = rows.reduce(
    (acc, r) => {
      acc.total_executions += parseInt(r.total_executions);
      acc.total_pass       += parseInt(r.total_executions) * parseFloat(r.pass_pct ?? 0) / 100;
      acc.open_critical    += parseInt(r.open_critical ?? 0);
      return acc;
    },
    { total_executions: 0, total_pass: 0, open_critical: 0 }
  );

  // total_pass is weighted sum of (executions × pass_pct/100), so ratio is total_pass/total_executions
  const portfolio_pass_pct = totals.total_executions > 0
    ? Math.round(totals.total_pass / totals.total_executions * 1000) / 10
    : 0;

  const programs_at_risk = programs.filter((p) => p.health === 'red').length;

  return {
    programs,
    portfolio: {
      total_executions: totals.total_executions,
      pass_pct:         portfolio_pass_pct,
      open_critical:    totals.open_critical,
      programs_at_risk,
    },
  };
}

// ── Portfolio coverage (separate query — coverage is per release not program) ──
async function getPortfolioCoverage() {
  const { rows: [row] } = await db.query(`
    SELECT
      ROUND(
        100.0 * SUM(covered_requirements) / NULLIF(SUM(total_requirements), 0)
      , 1) AS coverage_pct
    FROM v_requirement_coverage_summary
  `);
  return parseFloat(row?.coverage_pct ?? 0);
}

// ── Weekly pass rate trend per program (last 20 weeks) ────────
async function getProgramTrend() {
  const { rows } = await db.query(`
    WITH last_weeks AS (
      SELECT DISTINCT week_num, week_label
      FROM dim_date
      ORDER BY week_num DESC
      LIMIT 20
    )
    SELECT
      lw.week_num,
      lw.week_label,
      p.program_name,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE fte.status = 'PASS')
        / NULLIF(COUNT(*), 0)
      , 1) AS pass_rate
    FROM last_weeks lw
    JOIN dim_date dd ON dd.week_num = lw.week_num
    JOIN fact_test_execution fte ON fte.date_id = dd.date_id
    JOIN dim_program p ON fte.program_id = p.program_id
    GROUP BY lw.week_num, lw.week_label, p.program_name
    ORDER BY lw.week_num, p.program_name
  `);

  // Collect all week labels in ascending order
  const weekMap = new Map();
  const programSet = new Set();

  for (const r of rows) {
    programSet.add(r.program_name);
    if (!weekMap.has(r.week_num)) {
      weekMap.set(r.week_num, { label: r.week_label, data: {} });
    }
    weekMap.get(r.week_num).data[r.program_name] = parseFloat(r.pass_rate ?? 0);
  }

  // Sort weeks ascending
  const sortedWeeks = [...weekMap.entries()].sort(([a], [b]) => a - b);
  const programs    = [...programSet].sort();

  return {
    weeks:    sortedWeeks.map(([, w]) => w.label),
    programs,
    data:     sortedWeeks.map(([, w]) => ({ week: w.label, ...w.data })),
  };
}

// ── Application-level health (all 12 apps) ───────────────────
async function getAppHealth() {
  const { rows } = await db.query(`
    SELECT
      a.app_id,
      a.app_name,
      p.program_name,
      COUNT(*)                                                              AS total_executions,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'PASS')
            / NULLIF(COUNT(*), 0), 1)                                       AS pass_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')
            / NULLIF(COUNT(*), 0), 1)                                       AS fail_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')
            / NULLIF(COUNT(*), 0), 1)                                       AS blocked_pct
    FROM fact_test_execution fte
    JOIN dim_application a  ON fte.app_id     = a.app_id
    JOIN dim_program     p  ON fte.program_id  = p.program_id
    GROUP BY a.app_id, a.app_name, p.program_name
    ORDER BY pass_pct ASC
  `);

  return {
    apps: rows.map((r) => ({
      app_id:           r.app_id,
      app_name:         r.app_name,
      program_name:     r.program_name,
      total_executions: parseInt(r.total_executions),
      pass_pct:         parseFloat(r.pass_pct ?? 0),
      fail_pct:         parseFloat(r.fail_pct ?? 0),
      blocked_pct:      parseFloat(r.blocked_pct ?? 0),
      health:           healthColor(parseFloat(r.pass_pct ?? 0)),
    })),
  };
}

// ── Open defects by program × severity ───────────────────────
async function getDefectsByProgram() {
  const { rows } = await db.query(`
    SELECT
      p.program_name,
      COUNT(*) FILTER (WHERE fd.severity = 'Critical'
                        AND fd.status IN ('Open','In Progress'))  AS critical,
      COUNT(*) FILTER (WHERE fd.severity = 'High'
                        AND fd.status IN ('Open','In Progress'))  AS high,
      COUNT(*) FILTER (WHERE fd.severity = 'Medium'
                        AND fd.status IN ('Open','In Progress'))  AS medium,
      COUNT(*) FILTER (WHERE fd.severity = 'Low'
                        AND fd.status IN ('Open','In Progress'))  AS low,
      COUNT(*) FILTER (WHERE fd.status IN ('Open','In Progress')) AS total_open
    FROM fact_defect fd
    JOIN dim_program p ON fd.program_id = p.program_id
    GROUP BY p.program_name
    ORDER BY total_open DESC
  `);

  return {
    programs: rows.map((r) => r.program_name),
    series: {
      critical: rows.map((r) => parseInt(r.critical ?? 0)),
      high:     rows.map((r) => parseInt(r.high     ?? 0)),
      medium:   rows.map((r) => parseInt(r.medium   ?? 0)),
      low:      rows.map((r) => parseInt(r.low      ?? 0)),
    },
  };
}

module.exports = { getProgramHealth, getPortfolioCoverage, getProgramTrend, getAppHealth, getDefectsByProgram };
