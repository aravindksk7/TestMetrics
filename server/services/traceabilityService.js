const db = require('../config/database');

// ── KPI summary ───────────────────────────────────────────────
async function getTraceabilityKpis() {
  const { rows: [totals] } = await db.query(`
    SELECT
      COUNT(DISTINCT req_id)                                           AS total_reqs,
      COUNT(DISTINCT req_id) FILTER (WHERE is_covered = TRUE)         AS covered_reqs
    FROM fact_requirement_coverage
  `);

  // High-priority gaps: uncovered HIGH reqs across the most recent active release
  const { rows: [gaps] } = await db.query(`
    SELECT COUNT(DISTINCT frc.req_id) AS high_gaps
    FROM fact_requirement_coverage frc
    JOIN dim_requirement r ON frc.req_id = r.req_id
    JOIN dim_release     dr ON frc.release_id = dr.release_id
    WHERE r.priority   = 'High'
      AND frc.is_covered = FALSE
      AND dr.status IN ('Active','Planning')
  `);

  const total   = parseInt(totals.total_reqs    ?? 0);
  const covered = parseInt(totals.covered_reqs  ?? 0);

  return {
    total_requirements: total,
    covered:            covered,
    uncovered:          total - covered,
    coverage_pct:       total > 0 ? Math.round(covered / total * 1000) / 10 : 0,
    high_priority_gaps: parseInt(gaps.high_gaps ?? 0),
  };
}

// ── Coverage by release (bar chart) ──────────────────────────
async function getCoverageByRelease() {
  const { rows } = await db.query(`
    SELECT
      dr.release_name,
      dr.release_date,
      COUNT(DISTINCT frc.req_id)                                      AS total,
      COUNT(DISTINCT frc.req_id) FILTER (WHERE frc.is_covered = TRUE) AS covered
    FROM fact_requirement_coverage frc
    JOIN dim_release dr ON frc.release_id = dr.release_id
    GROUP BY dr.release_id, dr.release_name, dr.release_date
    ORDER BY dr.release_date
  `);

  return {
    releases:    rows.map((r) => r.release_name),
    covered:     rows.map((r) => parseInt(r.covered)),
    uncovered:   rows.map((r) => parseInt(r.total) - parseInt(r.covered)),
    total:       rows.map((r) => parseInt(r.total)),
    coverage_pct: rows.map((r) =>
      parseInt(r.total) > 0 ? Math.round(parseInt(r.covered) / parseInt(r.total) * 1000) / 10 : 0
    ),
  };
}

// ── Coverage by priority × release ───────────────────────────
async function getCoverageByPriority() {
  const { rows } = await db.query(`
    SELECT
      dr.release_name,
      dr.release_date,
      req.priority,
      COUNT(DISTINCT frc.req_id)                                        AS total,
      COUNT(DISTINCT frc.req_id) FILTER (WHERE frc.is_covered = TRUE)  AS covered
    FROM fact_requirement_coverage frc
    JOIN dim_requirement req ON frc.req_id    = req.req_id
    JOIN dim_release     dr  ON frc.release_id = dr.release_id
    GROUP BY dr.release_id, dr.release_name, dr.release_date, req.priority
    ORDER BY dr.release_date, req.priority
  `);

  // Build pivot: { releases: [], High: [], Medium: [], Low: [] }
  const releaseMap = new Map();
  for (const r of rows) {
    if (!releaseMap.has(r.release_name)) {
      releaseMap.set(r.release_name, { High: 0, Medium: 0, Low: 0 });
    }
    const covered = parseInt(r.covered);
    const total   = parseInt(r.total);
    releaseMap.get(r.release_name)[r.priority] =
      total > 0 ? Math.round(covered / total * 1000) / 10 : 0;
  }

  const releases = [...releaseMap.keys()];
  return {
    releases,
    data: releases.map((rel) => ({ release: rel, ...releaseMap.get(rel) })),
  };
}

// ── Uncovered requirements (for latest non-completed release) ─
async function getUncoveredRequirements() {
  const { rows } = await db.query(`
    SELECT
      req.req_key,
      req.req_summary,
      req.priority,
      STRING_AGG(dr.release_name, ', ' ORDER BY dr.release_name) AS uncovered_in_releases,
      COUNT(DISTINCT frc.release_id)                              AS release_count
    FROM fact_requirement_coverage frc
    JOIN dim_requirement req ON frc.req_id    = req.req_id
    JOIN dim_release     dr  ON frc.release_id = dr.release_id
    WHERE frc.is_covered = FALSE
    GROUP BY req.req_id, req.req_key, req.req_summary, req.priority
    ORDER BY
      CASE req.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
      release_count DESC
    LIMIT 30
  `);

  return {
    requirements: rows.map((r) => ({
      req_key:               r.req_key,
      req_summary:           r.req_summary,
      priority:              r.priority,
      uncovered_in_releases: r.uncovered_in_releases,
      release_count:         parseInt(r.release_count),
    })),
  };
}

// ── Test pass rate per requirement ────────────────────────────
async function getRequirementTestPerformance() {
  const { rows } = await db.query(`
    SELECT
      req.req_key,
      req.priority,
      COUNT(DISTINCT frc.test_id)                                           AS linked_tests,
      COUNT(fte.exec_id)                                                    AS total_execs,
      ROUND(
        100.0 * COUNT(fte.exec_id) FILTER (WHERE fte.status = 'PASS')
        / NULLIF(COUNT(fte.exec_id), 0)
      , 1)                                                                  AS pass_rate,
      ROUND(
        100.0 * COUNT(fte.exec_id) FILTER (WHERE fte.status = 'FAIL')
        / NULLIF(COUNT(fte.exec_id), 0)
      , 1)                                                                  AS fail_rate
    FROM fact_requirement_coverage frc
    JOIN dim_requirement req ON frc.req_id  = req.req_id
    LEFT JOIN fact_test_execution fte ON frc.test_id = fte.test_id
    WHERE frc.is_covered = TRUE
    GROUP BY req.req_id, req.req_key, req.priority
    HAVING COUNT(fte.exec_id) > 0
    ORDER BY pass_rate ASC
    LIMIT 20
  `);

  return {
    requirements: rows.map((r) => ({
      req_key:      r.req_key,
      priority:     r.priority,
      linked_tests: parseInt(r.linked_tests),
      total_execs:  parseInt(r.total_execs),
      pass_rate:    parseFloat(r.pass_rate ?? 0),
      fail_rate:    parseFloat(r.fail_rate ?? 0),
    })),
  };
}

module.exports = {
  getTraceabilityKpis,
  getCoverageByRelease,
  getCoverageByPriority,
  getUncoveredRequirements,
  getRequirementTestPerformance,
};
