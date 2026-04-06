require('dotenv').config();
const db = require('../../server/config/database');

// ── Fixed reference data ─────────────────────────────────────

const RELEASES = [
  { name: 'R1.0', version: '1.0.0', date: '2024-01-15', status: 'Completed' },
  { name: 'R1.1', version: '1.1.0', date: '2024-05-20', status: 'Completed' },
  { name: 'R2.0', version: '2.0.0', date: '2024-09-10', status: 'Completed' },
  { name: 'R2.1', version: '2.1.0', date: '2025-01-08', status: 'Active'    },
  { name: 'R3.0', version: '3.0.0', date: '2025-07-01', status: 'Planning'  },
];

const PROGRAMS = ['Alpha', 'Beta', 'Gamma', 'Delta'];

const APPLICATIONS = {
  Alpha: ['Alpha Core', 'Alpha Portal', 'Alpha API'],
  Beta:  ['Beta Engine', 'Beta UI',     'Beta Services'],
  Gamma: ['Gamma Platform', 'Gamma Sync', 'Gamma Reports'],
  Delta: ['Delta Gateway', 'Delta Auth',  'Delta Data'],
};

const ENVIRONMENTS = ['DEV', 'SIT', 'UAT', 'PERF', 'PROD'];

const TEST_TYPES     = ['Manual', 'Automated', 'Cucumber', 'Generic'];
const PRIORITIES     = ['High', 'Medium', 'Low'];
const PRIORITIES_W   = [0.3, 0.45, 0.25];   // weighted random for tests

// ── Helpers ──────────────────────────────────────────────────

function weightedPick(arr, weights, rand) {
  const r = rand();
  let acc = 0;
  for (let i = 0; i < arr.length; i++) {
    acc += weights[i];
    if (r < acc) return arr[i];
  }
  return arr[arr.length - 1];
}

// Simple seeded LCG — deterministic
function makeLcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Generate dim_date rows: one row per day from 2024-01-01 to 2026-04-30
function generateDates() {
  const rows = [];
  const start = new Date('2024-01-01');
  const end   = new Date('2026-04-30');
  const base  = new Date('2024-01-01');   // W1 starts here

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const full_date = d.toISOString().slice(0, 10);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekNum   = Math.floor((d - base) / msPerWeek) + 1;
    rows.push({
      full_date,
      week_num:   weekNum,
      month_num:  d.getMonth() + 1,
      year:       d.getFullYear(),
      week_label: `W${weekNum}`,
    });
  }
  return rows;
}

// ── Main ─────────────────────────────────────────────────────

async function seedDimensions() {
  console.log('[seed] Seeding dimensions…');
  const rand = makeLcg(7);

  // dim_release
  for (const r of RELEASES) {
    await db.query(
      `INSERT INTO dim_release (release_name, release_version, release_date, status)
       VALUES ($1,$2,$3,$4) ON CONFLICT (release_name) DO NOTHING`,
      [r.name, r.version, r.date, r.status]
    );
  }
  console.log(`  dim_release: ${RELEASES.length} rows`);

  // dim_program + dim_application
  for (const prog of PROGRAMS) {
    await db.query(
      `INSERT INTO dim_program (program_name) VALUES ($1) ON CONFLICT (program_name) DO NOTHING`,
      [prog]
    );
    const { rows: [p] } = await db.query(
      `SELECT program_id FROM dim_program WHERE program_name = $1`, [prog]
    );
    for (const app of APPLICATIONS[prog]) {
      await db.query(
        `INSERT INTO dim_application (app_name, program_id)
         VALUES ($1,$2) ON CONFLICT (app_name, program_id) DO NOTHING`,
        [app, p.program_id]
      );
    }
  }
  console.log(`  dim_program: ${PROGRAMS.length} rows`);
  console.log(`  dim_application: ${Object.values(APPLICATIONS).flat().length} rows`);

  // dim_environment
  for (const env of ENVIRONMENTS) {
    await db.query(
      `INSERT INTO dim_environment (env_name) VALUES ($1) ON CONFLICT (env_name) DO NOTHING`,
      [env]
    );
  }
  console.log(`  dim_environment: ${ENVIRONMENTS.length} rows`);

  // dim_test (200 rows)
  let testCount = 0;
  for (let i = 1; i <= 200; i++) {
    const key  = `XRAY-${String(i).padStart(3, '0')}`;
    const type = TEST_TYPES[Math.floor(rand() * TEST_TYPES.length)];
    const pri  = weightedPick(PRIORITIES, PRIORITIES_W, rand);
    const res = await db.query(
      `INSERT INTO dim_test (test_key, test_summary, test_type, priority)
       VALUES ($1,$2,$3,$4) ON CONFLICT (test_key) DO NOTHING RETURNING test_id`,
      [key, `Test case ${key}`, type, pri]
    );
    if (res.rowCount > 0) testCount++;
  }
  console.log(`  dim_test: ${testCount} inserted`);

  // dim_requirement (100 rows)
  let reqCount = 0;
  for (let i = 1; i <= 100; i++) {
    const key = `REQ-${String(i).padStart(3, '0')}`;
    const pri = weightedPick(PRIORITIES, PRIORITIES_W, rand);
    const res = await db.query(
      `INSERT INTO dim_requirement (req_key, req_summary, priority)
       VALUES ($1,$2,$3) ON CONFLICT (req_key) DO NOTHING RETURNING req_id`,
      [key, `Requirement ${key}`, pri]
    );
    if (res.rowCount > 0) reqCount++;
  }
  console.log(`  dim_requirement: ${reqCount} inserted`);

  // dim_date
  const dates   = generateDates();
  let dateCount = 0;
  for (const row of dates) {
    const res = await db.query(
      `INSERT INTO dim_date (full_date, week_num, month_num, year, week_label)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (full_date) DO NOTHING RETURNING date_id`,
      [row.full_date, row.week_num, row.month_num, row.year, row.week_label]
    );
    if (res.rowCount > 0) dateCount++;
  }
  console.log(`  dim_date: ${dateCount} inserted (${dates.length} total days)`);

  console.log('[seed] Dimensions done.');
}

module.exports = { seedDimensions };

if (require.main === module) {
  seedDimensions().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
