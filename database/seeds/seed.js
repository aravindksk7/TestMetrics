require('dotenv').config();
const { seedDimensions } = require('./seed_dimensions');
const { seedExecutions  } = require('./seed_executions');
const { seedCoverage    } = require('./seed_coverage');
const { seedDefects     } = require('./seed_defects');
const { seedWeekly      } = require('./seed_weekly');

async function runAll() {
  console.log('═══ Seed Start ═══════════════════════════════════');
  const t0 = Date.now();

  await seedDimensions();
  await seedExecutions();
  await seedCoverage();
  await seedDefects();
  await seedWeekly();

  console.log(`═══ Seed Complete (${((Date.now() - t0) / 1000).toFixed(1)}s) ════════════════`);
  process.exit(0);
}

runAll().catch((e) => { console.error(e); process.exit(1); });
