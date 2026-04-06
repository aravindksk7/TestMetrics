require('dotenv').config();
const db = require('../../server/config/database');

// Derives fact_weekly_metrics by aggregating fact_test_execution
// Always safe to re-run (TRUNCATE + re-insert)
async function seedWeekly() {
  console.log('[seed] Building fact_weekly_metrics…');

  await db.query('TRUNCATE fact_weekly_metrics RESTART IDENTITY CASCADE');

  // Aggregate weekly pass/fail/blocked rates per (week, release)
  // Then compute RRI using the same formula as v_rri
  const result = await db.query(`
    INSERT INTO fact_weekly_metrics (date_id, release_id, pass_rate, fail_rate, blocked_rate, rri_score)
    SELECT
      dd.date_id,
      fte.release_id,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'PASS')    / NULLIF(COUNT(*),0), 2) AS pass_rate,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'FAIL')    / NULLIF(COUNT(*),0), 2) AS fail_rate,
      ROUND(100.0 * COUNT(*) FILTER (WHERE fte.status = 'BLOCKED') / NULLIF(COUNT(*),0), 2) AS blocked_rate,
      0 AS rri_score   -- updated below after coverage is known
    FROM fact_test_execution fte
    JOIN dim_date dd ON fte.date_id = dd.date_id
    GROUP BY dd.date_id, fte.release_id
    ON CONFLICT (date_id, release_id) DO UPDATE
      SET pass_rate    = EXCLUDED.pass_rate,
          fail_rate    = EXCLUDED.fail_rate,
          blocked_rate = EXCLUDED.blocked_rate
    RETURNING week_id
  `);

  // Update rri_score using coverage from v_requirement_coverage_summary
  await db.query(`
    UPDATE fact_weekly_metrics fwm
    SET rri_score = ROUND(
      (fwm.pass_rate    * 0.40)
    + (rc.coverage_pct  * 0.30)
    + ((100 - fwm.fail_rate)    * 0.20)
    + ((100 - fwm.blocked_rate) * 0.10)
    , 1)
    FROM v_requirement_coverage_summary rc
    WHERE fwm.release_id = rc.release_id
  `);

  const { rows: [{ count }] } = await db.query('SELECT COUNT(*) FROM fact_weekly_metrics');
  console.log(`  fact_weekly_metrics: ${count} rows`);
  console.log('[seed] Weekly metrics done.');
}

module.exports = { seedWeekly };

if (require.main === module) {
  seedWeekly().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
