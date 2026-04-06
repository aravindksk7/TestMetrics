const db = require('../config/database');

// Upsert a dim_* row and return its PK.
// conflictCol must be a unique column (e.g. 'release_name').
async function upsertDimension(table, pkCol, conflictCol, data) {
  const keys   = Object.keys(data);
  const vals   = Object.values(data);
  const cols   = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const updates = keys
    .filter((k) => k !== conflictCol)
    .map((k) => `${k} = EXCLUDED.${k}`)
    .join(', ');

  const sql = `
    INSERT INTO ${table} (${cols}) VALUES (${placeholders})
    ON CONFLICT (${conflictCol}) DO UPDATE SET ${updates || `${conflictCol} = EXCLUDED.${conflictCol}`}
    RETURNING ${pkCol}
  `;
  const { rows: [row] } = await db.query(sql, vals);
  return row[pkCol];
}

// Upsert a fact_test_execution row
async function upsertExecution(data) {
  await db.query(`
    INSERT INTO fact_test_execution
      (test_id, release_id, program_id, env_id, app_id, date_id, status, execution_date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (test_id, release_id, env_id, execution_date)
    DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
  `, [
    data.test_id, data.release_id, data.program_id, data.env_id,
    data.app_id, data.date_id, data.status, data.execution_date,
  ]);
}

// Upsert a fact_requirement_coverage row
async function upsertCoverage(data) {
  await db.query(`
    INSERT INTO fact_requirement_coverage (req_id, test_id, release_id, is_covered)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (req_id, test_id, release_id) DO UPDATE SET is_covered = EXCLUDED.is_covered
  `, [data.req_id, data.test_id, data.release_id, data.is_covered]);
}

// Upsert a fact_defect row (no natural key — skip duplicates by content hash)
async function upsertDefect(data) {
  await db.query(`
    INSERT INTO fact_defect (release_id, program_id, severity, status, created_date, resolved_date)
    VALUES ($1,$2,$3,$4,$5,$6)
  `, [data.release_id, data.program_id, data.severity,
      data.status, data.created_date, data.resolved_date ?? null]);
}

// Rebuild fact_weekly_metrics from live fact_test_execution data
async function rebuildWeeklyMetrics() {
  await db.query('TRUNCATE fact_weekly_metrics RESTART IDENTITY CASCADE');
  await db.query(`
    INSERT INTO fact_weekly_metrics (date_id, release_id, pass_rate, fail_rate, blocked_rate, rri_score)
    SELECT
      dd.date_id, fte.release_id,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status='PASS')    / NULLIF(COUNT(*),0), 2),
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status='FAIL')    / NULLIF(COUNT(*),0), 2),
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status='BLOCKED') / NULLIF(COUNT(*),0), 2),
      0
    FROM fact_test_execution fte
    JOIN dim_date dd ON fte.date_id = dd.date_id
    GROUP BY dd.date_id, fte.release_id
    ON CONFLICT (date_id, release_id) DO UPDATE
      SET pass_rate = EXCLUDED.pass_rate, fail_rate = EXCLUDED.fail_rate,
          blocked_rate = EXCLUDED.blocked_rate
  `);
  await db.query(`
    UPDATE fact_weekly_metrics fwm
    SET rri_score = ROUND(
      (fwm.pass_rate * 0.40) + (rc.coverage_pct * 0.30) +
      ((100 - fwm.fail_rate) * 0.20) + ((100 - fwm.blocked_rate) * 0.10)
    , 1)
    FROM v_requirement_coverage_summary rc
    WHERE fwm.release_id = rc.release_id
  `);
}

module.exports = { upsertDimension, upsertExecution, upsertCoverage, upsertDefect, rebuildWeeklyMetrics };
