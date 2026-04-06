-- =============================================================
-- V1.2.0 — Computed Metric Views (DAX → SQL)
-- =============================================================

-- v_execution_summary
-- Aggregated pass/fail/blocked counts and rates per release × program × environment
CREATE OR REPLACE VIEW v_execution_summary AS
SELECT
  r.release_id,
  r.release_name,
  p.program_id,
  p.program_name,
  e.env_id,
  e.env_name,
  COUNT(*)                                                              AS total_executions,
  COUNT(*) FILTER (WHERE fte.status = 'PASS')                          AS passed,
  COUNT(*) FILTER (WHERE fte.status = 'FAIL')                          AS failed,
  COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')                       AS blocked,
  COUNT(*) FILTER (WHERE fte.status = 'IN_PROGRESS')                   AS in_progress,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'PASS')
        / NULLIF(COUNT(*), 0), 2)                                       AS pass_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')
        / NULLIF(COUNT(*), 0), 2)                                       AS fail_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'BLOCKED')
        / NULLIF(COUNT(*), 0), 2)                                       AS blocked_rate
FROM fact_test_execution fte
JOIN dim_release      r ON fte.release_id = r.release_id
JOIN dim_program      p ON fte.program_id = p.program_id
JOIN dim_environment  e ON fte.env_id     = e.env_id
GROUP BY
  r.release_id, r.release_name,
  p.program_id, p.program_name,
  e.env_id,     e.env_name;

-- v_requirement_coverage_summary
-- Coverage % per release
CREATE OR REPLACE VIEW v_requirement_coverage_summary AS
SELECT
  release_id,
  COUNT(DISTINCT req_id)                                                  AS total_requirements,
  COUNT(DISTINCT req_id) FILTER (WHERE is_covered = TRUE)                 AS covered_requirements,
  ROUND(
    100.0 * COUNT(DISTINCT req_id) FILTER (WHERE is_covered = TRUE)
    / NULLIF(COUNT(DISTINCT req_id), 0)
  , 2)                                                                    AS coverage_pct
FROM fact_requirement_coverage
GROUP BY release_id;

-- v_release_execution_totals (helper, not exposed directly)
CREATE OR REPLACE VIEW v_release_execution_totals AS
SELECT
  release_id,
  SUM(total_executions)  AS total,
  SUM(passed)            AS passed,
  SUM(failed)            AS failed,
  SUM(blocked)           AS blocked,
  ROUND(100.0 * SUM(passed)  / NULLIF(SUM(total_executions), 0), 2) AS pass_rate,
  ROUND(100.0 * SUM(failed)  / NULLIF(SUM(total_executions), 0), 2) AS fail_rate,
  ROUND(100.0 * SUM(blocked) / NULLIF(SUM(total_executions), 0), 2) AS blocked_rate
FROM v_execution_summary
GROUP BY release_id;

-- v_rri
-- Release Readiness Index per release
-- Formula: (Pass% × 0.4) + (Coverage% × 0.3) + ((100 − Fail%) × 0.2) + ((100 − Blocked%) × 0.1)
CREATE OR REPLACE VIEW v_rri AS
SELECT
  ret.release_id,
  r.release_name,
  r.release_date,
  ROUND(
    (ret.pass_rate    * 0.40)
  + (rc.coverage_pct  * 0.30)
  + ((100 - ret.fail_rate)    * 0.20)
  + ((100 - ret.blocked_rate) * 0.10)
  , 1)                          AS rri_score,
  ret.pass_rate,
  ret.fail_rate,
  ret.blocked_rate,
  rc.coverage_pct,
  ret.total                     AS total_executions
FROM v_release_execution_totals ret
JOIN dim_release                r  ON ret.release_id = r.release_id
JOIN v_requirement_coverage_summary rc ON ret.release_id = rc.release_id;

-- v_open_critical_defects
-- Count of open/in-progress critical defects per release
CREATE OR REPLACE VIEW v_open_critical_defects AS
SELECT
  release_id,
  COUNT(*) AS open_critical_count
FROM fact_defect
WHERE severity = 'Critical'
  AND status   IN ('Open', 'In Progress')
GROUP BY release_id;
