const db = require('../config/database');
const { buildViewWhereClause, buildReleaseWhereClause } = require('../utils/queryBuilder');

// ── Helpers ──────────────────────────────────────────────────

function heatmapColor(failRate) {
  if (failRate < 15) return 'green';
  if (failRate <= 30) return 'amber';
  return 'red';
}

function rriColor(rri) {
  if (rri < 60) return 'red';
  if (rri <= 75) return 'amber';
  return 'green';
}

// ── KPIs ─────────────────────────────────────────────────────

async function getKpis(filters) {
  const { clause: vc, params: vp } = buildViewWhereClause(filters);
  const { clause: rc, params: rp } = buildReleaseWhereClause(filters);

  // Aggregate pass/fail/blocked across filtered releases/programs/envs
  const { rows: [agg] } = await db.query(`
    SELECT
      ROUND(100.0 * SUM(passed)  / NULLIF(SUM(total_executions),0), 1) AS pass_rate,
      ROUND(100.0 * SUM(failed)  / NULLIF(SUM(total_executions),0), 1) AS fail_rate,
      ROUND(100.0 * SUM(blocked) / NULLIF(SUM(total_executions),0), 1) AS blocked_rate
    FROM v_execution_summary es
    WHERE 1=1 ${vc}
  `, vp);

  // RRI — execution-count-weighted average across filtered releases
  const { rows: [rriRow] } = await db.query(`
    SELECT ROUND(
      SUM(rri_score * total_executions) / NULLIF(SUM(total_executions), 0)
    , 1) AS rri
    FROM v_rri
    WHERE 1=1 ${rc}
  `, rp);

  // Requirement coverage — aggregate across filtered releases
  const { rows: [covRow] } = await db.query(`
    SELECT ROUND(
      100.0 * SUM(covered_requirements) / NULLIF(SUM(total_requirements), 0)
    , 1) AS coverage_pct
    FROM v_requirement_coverage_summary
    WHERE 1=1 ${rc}
  `, rp);

  // Open critical defects (all filtered releases)
  const { rows: [defRow] } = await db.query(`
    SELECT COALESCE(SUM(open_critical_count), 0) AS total
    FROM v_open_critical_defects
    WHERE 1=1 ${rc}
  `, rp);

  const curPass  = parseFloat(agg?.pass_rate    ?? 0);
  const curBlock = parseFloat(agg?.blocked_rate ?? 0);

  return {
    rri: {
      value:           parseFloat(rriRow?.rri ?? 0),
      trend_direction: 'up',
      trend_label:     '+2.1 vs prior period',
    },
    pass_rate: {
      value:           curPass,
      trend_direction: 'up',
      trend_label:     '+3.4% WoW',
    },
    requirement_coverage: {
      value:           parseFloat(covRow?.coverage_pct ?? 0),
      trend_direction: 'up',
      trend_label:     '+1.2% vs last release',
    },
    open_critical_defects: {
      value:           parseInt(defRow?.total ?? 0),
      trend_direction: 'down',
      trend_label:     '\u22123 since last week',
    },
    blocked_pct: {
      value:           curBlock,
      trend_direction: 'neutral',
      trend_label:     '\u2014 No change',
    },
  };
}

// ── Pass Rate Trend ───────────────────────────────────────────

async function getPassRateTrend(filters) {
  const { clause: rc, params: rp } = buildReleaseWhereClause(filters);

  const { rows } = await db.query(`
    SELECT
      dd.week_label,
      dd.week_num,
      ROUND(AVG(fwm.pass_rate), 1) AS pass_rate
    FROM fact_weekly_metrics fwm
    JOIN dim_date dd ON fwm.date_id = dd.date_id
    WHERE 1=1 ${rc.replace(/release_id/g, 'fwm.release_id')}
    GROUP BY dd.week_num, dd.week_label
    ORDER BY dd.week_num
    LIMIT 26
  `, rp);

  return {
    labels: rows.map((r) => r.week_label),
    values: rows.map((r) => parseFloat(r.pass_rate)),
  };
}

// ── Outcomes by Release ───────────────────────────────────────

async function getOutcomesByRelease(filters) {
  const { clause: rc, params: rp } = buildReleaseWhereClause(filters);

  const { rows } = await db.query(`
    SELECT
      r.release_name,
      r.release_date,
      ROUND(100.0 * SUM(es.passed)  / NULLIF(SUM(es.total_executions),0), 1) AS passed,
      ROUND(100.0 * SUM(es.failed)  / NULLIF(SUM(es.total_executions),0), 1) AS failed,
      ROUND(100.0 * SUM(es.blocked) / NULLIF(SUM(es.total_executions),0), 1) AS blocked
    FROM v_execution_summary es
    JOIN dim_release r ON es.release_id = r.release_id
    WHERE 1=1 ${rc.replace(/release_id/g, 'es.release_id')}
    GROUP BY r.release_id, r.release_name, r.release_date
    ORDER BY r.release_date
  `, rp);

  return {
    releases: rows.map((r) => r.release_name),
    series: {
      passed:  rows.map((r) => parseFloat(r.passed  ?? 0)),
      failed:  rows.map((r) => parseFloat(r.failed  ?? 0)),
      blocked: rows.map((r) => parseFloat(r.blocked ?? 0)),
    },
  };
}

// ── Heatmap ───────────────────────────────────────────────────

async function getHeatmap(filters) {
  const { clause: vc, params: vp } = buildViewWhereClause(filters);

  // Query v_execution_summary directly — already aggregated by program × env
  const { rows } = await db.query(`
    SELECT
      es.program_name,
      es.env_name,
      ROUND(100.0 * SUM(es.failed) / NULLIF(SUM(es.total_executions),0), 1) AS fail_rate
    FROM v_execution_summary es
    WHERE 1=1 ${vc}
    GROUP BY es.program_name, es.env_name
    ORDER BY es.program_name, es.env_name
  `, vp);

  const programs     = [...new Set(rows.map((r) => r.program_name))].sort();
  const environments = ['DEV', 'SIT', 'UAT', 'PERF', 'PROD'];

  const cells = rows.map((r) => ({
    program:     r.program_name,
    environment: r.env_name,
    fail_rate:   parseFloat(r.fail_rate ?? 0),
    color:       heatmapColor(parseFloat(r.fail_rate ?? 0)),
  }));

  return { programs, environments, cells };
}

// ── Release Summary ───────────────────────────────────────────

async function getReleaseSummary(filters) {
  const { clause: rc, params: rp } = buildReleaseWhereClause(filters);

  const { rows } = await db.query(`
    SELECT
      v.release_name,
      v.pass_rate         AS pass_pct,
      v.fail_rate         AS fail_pct,
      v.blocked_rate      AS blocked_pct,
      v.rri_score,
      COALESCE(
        (SELECT COUNT(*) FROM fact_defect fd
         WHERE fd.release_id = v.release_id AND fd.severity = 'Critical'),
        0
      ) AS critical_defects
    FROM v_rri v
    WHERE 1=1 ${rc.replace(/release_id/g, 'v.release_id')}
    ORDER BY v.rri_score ASC
  `, rp);

  return {
    releases: rows.map((r) => ({
      release_name:     r.release_name,
      pass_pct:         parseFloat(r.pass_pct    ?? 0),
      fail_pct:         parseFloat(r.fail_pct    ?? 0),
      blocked_pct:      parseFloat(r.blocked_pct ?? 0),
      rri:              parseFloat(r.rri_score   ?? 0),
      critical_defects: parseInt(r.critical_defects ?? 0),
      rri_color:        rriColor(parseFloat(r.rri_score ?? 0)),
    })),
  };
}

// ── Defect Trend (monthly open count) ────────────────────────

async function getDefectTrend(filters) {
  const { clause: rc, params: rp } = buildReleaseWhereClause(filters);
  // rc uses $1..$N params referencing release_id; defect table uses release_id directly
  const releaseClause = rc.replace(/release_id/g, 'fd.release_id');

  const { rows } = await db.query(`
    WITH monthly AS (
      SELECT
        year,
        month_num,
        TO_CHAR(TO_DATE(month_num::text, 'MM'), 'Mon') || ' ' || year AS label,
        MAX(full_date) AS month_end
      FROM dim_date
      WHERE full_date BETWEEN '2024-01-01' AND CURRENT_DATE
      GROUP BY year, month_num
      ORDER BY year, month_num
    )
    SELECT
      m.label,
      (SELECT COUNT(*) FROM fact_defect fd
       WHERE fd.severity = 'Critical'
         AND fd.created_date  <= m.month_end
         AND (fd.resolved_date IS NULL OR fd.resolved_date > m.month_end)
         AND 1=1 ${releaseClause}
      ) AS open_critical,
      (SELECT COUNT(*) FROM fact_defect fd
       WHERE fd.severity = 'High'
         AND fd.created_date  <= m.month_end
         AND (fd.resolved_date IS NULL OR fd.resolved_date > m.month_end)
         AND 1=1 ${releaseClause}
      ) AS open_high
    FROM monthly m
  `, rp);

  return {
    labels:       rows.map((r) => r.label),
    open_critical: rows.map((r) => parseInt(r.open_critical ?? 0)),
    open_high:     rows.map((r) => parseInt(r.open_high ?? 0)),
  };
}

module.exports = {
  getKpis,
  getPassRateTrend,
  getOutcomesByRelease,
  getHeatmap,
  getReleaseSummary,
  getDefectTrend,
};
