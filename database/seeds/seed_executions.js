require('dotenv').config();
const db = require('../../server/config/database');
const { makeLcg } = require('./lib/seedRandom');

// ── Per-release scale factors for fail/blocked rates
// Produces improvement trajectory: R1.0 (worst) → R3.0 (best)
// Overall weighted avg: pass ≈ 68.2%, blocked ≈ 9.4%
const RELEASE_SCALE = {
  'R1.0': { fail: 1.780, blocked: 2.260 },  // pass≈51%, fail≈35%, blocked≈14%
  'R1.1': { fail: 1.041, blocked: 1.330 },  // pass≈71%, fail≈20%, blocked≈9%
  'R2.0': { fail: 1.256, blocked: 1.891 },  // pass≈63%, fail≈24%, blocked≈12%
  'R2.1': { fail: 0.769, blocked: 0.978 },  // pass≈79%, fail≈15%, blocked≈6%
  'R3.0': { fail: 0.595, blocked: 0.673 },  // pass≈84%, fail≈12%, blocked≈5%
};

// ── Scenario map: (program:env) → { fail, blocked }
// Base rates calibrate the heatmap pattern; release scale shifts per-release quality
const SCENARIO_MAP = {
  'Alpha:DEV':   { fail: 0.08, blocked: 0.05 },
  'Alpha:SIT':   { fail: 0.24, blocked: 0.10 },
  'Alpha:UAT':   { fail: 0.38, blocked: 0.10 },
  'Alpha:PERF':  { fail: 0.21, blocked: 0.08 },
  'Alpha:PROD':  { fail: 0.05, blocked: 0.02 },

  'Beta:DEV':    { fail: 0.11, blocked: 0.06 },
  'Beta:SIT':    { fail: 0.41, blocked: 0.12 },
  'Beta:UAT':    { fail: 0.35, blocked: 0.10 },
  'Beta:PERF':   { fail: 0.14, blocked: 0.07 },
  'Beta:PROD':   { fail: 0.06, blocked: 0.02 },

  'Gamma:DEV':   { fail: 0.19, blocked: 0.08 },
  'Gamma:SIT':   { fail: 0.28, blocked: 0.09 },
  'Gamma:UAT':   { fail: 0.12, blocked: 0.05 },
  'Gamma:PERF':  { fail: 0.33, blocked: 0.11 },
  'Gamma:PROD':  { fail: 0.04, blocked: 0.02 },

  'Delta:DEV':   { fail: 0.07, blocked: 0.04 },
  'Delta:SIT':   { fail: 0.44, blocked: 0.10 },
  'Delta:UAT':   { fail: 0.27, blocked: 0.09 },
  'Delta:PERF':  { fail: 0.10, blocked: 0.06 },
  'Delta:PROD':  { fail: 0.03, blocked: 0.02 },
};

// Number of executions per (release, program, env) combination
// More rows for earlier releases to reflect historical depth
const EXEC_COUNTS = { 'R1.0': 55, 'R1.1': 50, 'R2.0': 48, 'R2.1': 45, 'R3.0': 40 };

async function seedExecutions() {
  console.log('[seed] Seeding fact_test_execution…');
  const rand = makeLcg(42);

  // Load dimension lookups
  const releases    = (await db.query('SELECT release_id, release_name, release_date FROM dim_release')).rows;
  const programs    = (await db.query('SELECT program_id, program_name FROM dim_program')).rows;
  const envs        = (await db.query('SELECT env_id, env_name FROM dim_environment')).rows;
  const apps        = (await db.query('SELECT app_id, app_name, program_id FROM dim_application')).rows;
  const tests       = (await db.query('SELECT test_id FROM dim_test ORDER BY test_id')).rows;

  // date lookup by full_date string
  const dateRows    = (await db.query('SELECT date_id, full_date FROM dim_date')).rows;
  const dateMap     = new Map(dateRows.map((r) => [r.full_date.toISOString().slice(0, 10), r.date_id]));

  function pickStatus(prog, env, relName, r) {
    const sc  = SCENARIO_MAP[`${prog}:${env}`] || { fail: 0.15, blocked: 0.08 };
    const rs  = RELEASE_SCALE[relName] || { fail: 1.0, blocked: 1.0 };
    const blk = Math.min(sc.blocked * rs.blocked, 0.90);
    const fai = Math.min(sc.fail * rs.fail, 0.99 - blk);
    const n   = r();
    if (n < blk) return 'BLOCKED';
    if (n < blk + fai) return 'FAIL';
    return 'PASS';
  }

  // Date range per release (executions distributed across release window)
  const releaseDateRanges = {
    'R1.0': ['2024-01-15', '2024-05-19'],
    'R1.1': ['2024-05-20', '2024-09-09'],
    'R2.0': ['2024-09-10', '2025-01-07'],
    'R2.1': ['2025-01-08', '2025-06-30'],
    'R3.0': ['2025-07-01', '2026-04-30'],
  };

  function randomDateInRange(startStr, endStr, r) {
    const start = new Date(startStr).getTime();
    const end   = new Date(endStr).getTime();
    const ms    = start + Math.floor(r() * (end - start));
    return new Date(ms).toISOString().slice(0, 10);
  }

  let total = 0;
  let skipped = 0;

  for (const release of releases) {
    const [rangeStart, rangeEnd] = releaseDateRanges[release.release_name];
    const countPerCell = EXEC_COUNTS[release.release_name] || 45;

    for (const program of programs) {
      const progApps = apps.filter((a) => a.program_id === program.program_id);

      for (const env of envs) {
        for (let i = 0; i < countPerCell; i++) {
          const test    = tests[Math.floor(rand() * tests.length)];
          const app     = progApps[Math.floor(rand() * progApps.length)];
          const status  = pickStatus(program.program_name, env.env_name, release.release_name, rand);
          const execDate = randomDateInRange(rangeStart, rangeEnd, rand);
          const dateId  = dateMap.get(execDate);

          if (!dateId) { skipped++; continue; }

          try {
            await db.query(
              `INSERT INTO fact_test_execution
                 (test_id, release_id, program_id, env_id, app_id, date_id, status, execution_date)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               ON CONFLICT (test_id, release_id, env_id, execution_date) DO UPDATE
                 SET status = EXCLUDED.status, updated_at = NOW()`,
              [test.test_id, release.release_id, program.program_id,
               env.env_id, app.app_id, dateId, status, execDate]
            );
            total++;
          } catch { skipped++; }
        }
      }
    }
  }

  console.log(`  fact_test_execution: ${total} rows (${skipped} skipped)`);
  console.log('[seed] Executions done.');
}

module.exports = { seedExecutions };

if (require.main === module) {
  seedExecutions().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
