require('dotenv').config();
const db = require('../../server/config/database');
const { makeLcg } = require('./lib/seedRandom');

// KPI "Open Critical Defects" = 7 (all from R1.0 — legacy bugs, never fixed)
// Other releases: critical defects were created but later Resolved (shown as historical in table)
// Table "Crit Defects" column shows TOTAL critical (open + resolved) per release: 7,2,4,1,0
const DEFECT_CONFIG = [
  { release: 'R1.0', openCritical: 7,  resolvedCritical: 0, otherDefects: 18 },
  { release: 'R1.1', openCritical: 0,  resolvedCritical: 2, otherDefects: 12 },
  { release: 'R2.0', openCritical: 0,  resolvedCritical: 4, otherDefects: 15 },
  { release: 'R2.1', openCritical: 0,  resolvedCritical: 1, otherDefects: 8  },
  { release: 'R3.0', openCritical: 0,  resolvedCritical: 0, otherDefects: 4  },
];

const NON_CRITICAL = ['High', 'Medium', 'Low'];
const NON_OPEN     = ['Resolved', 'Closed', 'In Progress'];

async function seedDefects() {
  console.log('[seed] Seeding fact_defect…');
  const rand = makeLcg(13);

  const releases = (await db.query('SELECT release_id, release_name, release_date FROM dim_release')).rows;
  const programs = (await db.query('SELECT program_id FROM dim_program')).rows;

  const releaseMap = new Map(releases.map((r) => [r.release_name, r]));

  // Clear existing defects for idempotent re-seeding
  await db.query('DELETE FROM fact_defect');

  let total = 0;

  for (const cfg of DEFECT_CONFIG) {
    const rel = releaseMap.get(cfg.release);
    if (!rel) continue;

    const baseDate = new Date(rel.release_date);

    // Insert open critical defects (only R1.0 has these — legacy unresolved bugs)
    for (let i = 0; i < cfg.openCritical; i++) {
      const prog = programs[Math.floor(rand() * programs.length)];
      const daysOffset = -Math.floor(rand() * 30);
      const created = new Date(baseDate);
      created.setDate(created.getDate() + daysOffset);

      await db.query(
        `INSERT INTO fact_defect (release_id, program_id, severity, status, created_date)
         VALUES ($1,$2,'Critical','Open',$3)`,
        [rel.release_id, prog.program_id, created.toISOString().slice(0, 10)]
      );
      total++;
    }

    // Insert resolved critical defects (historical — created during release, later fixed)
    for (let i = 0; i < (cfg.resolvedCritical || 0); i++) {
      const prog = programs[Math.floor(rand() * programs.length)];
      const daysOffset = -Math.floor(rand() * 30);
      const created = new Date(baseDate);
      created.setDate(created.getDate() + daysOffset);
      const resolved = new Date(created.getTime() + Math.floor(rand() * 21) * 86400000).toISOString().slice(0, 10);

      await db.query(
        `INSERT INTO fact_defect (release_id, program_id, severity, status, created_date, resolved_date)
         VALUES ($1,$2,'Critical','Resolved',$3,$4)`,
        [rel.release_id, prog.program_id, created.toISOString().slice(0, 10), resolved]
      );
      total++;
    }

    // Insert other defects (non-critical or resolved)
    for (let i = 0; i < cfg.otherDefects; i++) {
      const prog     = programs[Math.floor(rand() * programs.length)];
      const severity = NON_CRITICAL[Math.floor(rand() * NON_CRITICAL.length)];
      const status   = NON_OPEN[Math.floor(rand() * NON_OPEN.length)];
      const daysOffset = -Math.floor(rand() * 60);
      const created  = new Date(baseDate);
      created.setDate(created.getDate() + daysOffset);
      const resolved = status !== 'In Progress'
        ? new Date(created.getTime() + Math.floor(rand() * 14) * 86400000).toISOString().slice(0, 10)
        : null;

      await db.query(
        `INSERT INTO fact_defect (release_id, program_id, severity, status, created_date, resolved_date)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [rel.release_id, prog.program_id, severity, status, created.toISOString().slice(0, 10), resolved]
      );
      total++;
    }
  }

  console.log(`  fact_defect: ${total} rows`);
  console.log('[seed] Defects done.');
}

module.exports = { seedDefects };

if (require.main === module) {
  seedDefects().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
