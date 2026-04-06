require('dotenv').config();
const db = require('../../../server/config/database');

const TARGETS = {
  rri:       { value: 73.4, tolerance: 3.0 },  // aggregate across all releases
  pass_rate: { value: 68.2, tolerance: 3.0 },
  coverage:  { value: 81.5, tolerance: 2.0 },  // R1.1 coverage
  defects:   { value: 7,    tolerance: 0    },  // exact
  blocked:   { value: 9.4,  tolerance: 2.0 },
};

async function verifyKpis() {
  console.log('\n── KPI Verification ────────────────────────────────');

  // Aggregate pass/fail/blocked across all releases
  const { rows: [agg] } = await db.query(`
    SELECT
      ROUND(100.0 * SUM(passed)  / NULLIF(SUM(total_executions),0), 1) AS pass_rate,
      ROUND(100.0 * SUM(failed)  / NULLIF(SUM(total_executions),0), 1) AS fail_rate,
      ROUND(100.0 * SUM(blocked) / NULLIF(SUM(total_executions),0), 1) AS blocked_rate
    FROM v_execution_summary
  `);

  // Aggregate RRI (weighted by execution count)
  const { rows: [rriRow] } = await db.query(`
    SELECT ROUND(AVG(rri_score), 1) AS avg_rri FROM v_rri
  `);

  // Coverage for R1.1
  const { rows: [covRow] } = await db.query(`
    SELECT rc.coverage_pct
    FROM v_requirement_coverage_summary rc
    JOIN dim_release r ON rc.release_id = r.release_id
    WHERE r.release_name = 'R1.1'
  `);

  // Open critical defects (all releases)
  const { rows: [defRow] } = await db.query(`
    SELECT COALESCE(SUM(open_critical_count),0) AS total FROM v_open_critical_defects
  `);

  const actuals = {
    rri:       parseFloat(rriRow?.avg_rri       ?? 0),
    pass_rate: parseFloat(agg?.pass_rate        ?? 0),
    coverage:  parseFloat(covRow?.coverage_pct  ?? 0),
    defects:   parseInt(defRow?.total           ?? 0),
    blocked:   parseFloat(agg?.blocked_rate     ?? 0),
  };

  let allOk = true;
  for (const [key, { value: target, tolerance }] of Object.entries(TARGETS)) {
    const actual = actuals[key];
    const diff   = Math.abs(actual - target);
    const ok     = diff <= tolerance;
    if (!ok) allOk = false;
    const icon = ok ? '✓' : '✗';
    console.log(
      `  ${icon} ${key.padEnd(12)} actual=${String(actual).padStart(6)}  target=${String(target).padStart(6)}  diff=${diff.toFixed(1)}  tol=±${tolerance}`
    );
  }

  console.log('\n── Per-Release RRI ─────────────────────────────────');
  const rriRows = await db.query(
    'SELECT release_name, rri_score, pass_rate, fail_rate, blocked_rate, coverage_pct FROM v_rri ORDER BY rri_score'
  );
  for (const r of rriRows.rows) {
    console.log(`  ${r.release_name}  RRI=${r.rri_score}  pass=${r.pass_rate}%  fail=${r.fail_rate}%  blocked=${r.blocked_rate}%  cov=${r.coverage_pct}%`);
  }

  console.log('────────────────────────────────────────────────────\n');

  if (!allOk) {
    console.error('Some KPI values are outside tolerance. Adjust SCENARIO_MAP or seed counts.');
    process.exit(1);
  }
  console.log('All KPIs within tolerance ✓');
  process.exit(0);
}

verifyKpis().catch((e) => { console.error(e); process.exit(1); });
