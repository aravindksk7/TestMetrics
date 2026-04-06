require('dotenv').config();
const db = require('../../server/config/database');
const { makeLcg } = require('./lib/seedRandom');

// Coverage % targets per release
// Calibrated so:
//   - Average across all releases ≈ 81.5% (matches overall coverage KPI)
//   - Early releases have low coverage → low RRI; later releases near 100%
//   - R1.0 (40%): RRI ≈ 54 (RED) | R2.0 (70%): RRI ≈ 70 (AMBER)
//   - R1.1 (97%), R2.1 (100%), R3.0 (100%): GREEN
//   Avg = (40+97+70+100+100)/5 = 81.4% ≈ 81.5%
const COVERAGE_TARGETS = {
  'R1.0': 0.40,
  'R1.1': 0.97,
  'R2.0': 0.70,
  'R2.1': 1.00,
  'R3.0': 1.00,
};

async function seedCoverage() {
  console.log('[seed] Seeding fact_requirement_coverage…');
  const rand = makeLcg(99);

  const releases = (await db.query('SELECT release_id, release_name FROM dim_release')).rows;
  const tests    = (await db.query('SELECT test_id FROM dim_test ORDER BY test_id')).rows;
  const reqs     = (await db.query('SELECT req_id FROM dim_requirement ORDER BY req_id')).rows;

  let total = 0;

  for (const release of releases) {
    const targetRate = COVERAGE_TARGETS[release.release_name] ?? 0.75;

    for (const req of reqs) {
      const isCovered = rand() < targetRate;
      // Pick a random test to link to this requirement
      const test = tests[Math.floor(rand() * tests.length)];

      await db.query(
        `INSERT INTO fact_requirement_coverage (req_id, test_id, release_id, is_covered)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (req_id, test_id, release_id) DO UPDATE SET is_covered = EXCLUDED.is_covered`,
        [req.req_id, test.test_id, release.release_id, isCovered]
      );
      total++;
    }
  }

  console.log(`  fact_requirement_coverage: ${total} rows`);
  console.log('[seed] Coverage done.');
}

module.exports = { seedCoverage };

if (require.main === module) {
  seedCoverage().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
