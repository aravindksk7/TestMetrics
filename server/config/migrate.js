require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./database');

const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');

async function runMigrations() {
  // Ensure tracking table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = await db.query('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(applied.rows.map((r) => r.filename));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    console.log(`[migrate] Applying ${file}…`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[migrate] ✓ ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] ✗ ${file}: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('[migrate] All migrations current.');
}

module.exports = { runMigrations };

// Allow running directly: node server/config/migrate.js
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
