const db = require('../config/database');

/** Return all config values as a plain object */
async function getAll() {
  const { rows } = await db.query('SELECT key, value FROM app_config ORDER BY key');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Upsert multiple keys */
async function setMany(entries) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(entries)) {
      await client.query(
        `INSERT INTO app_config (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value ?? '']
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Test Jira/Xray connectivity using current config */
async function testConnection() {
  const cfg = await getAll();
  const baseUrl = cfg.jira_base_url?.trim();
  if (!baseUrl) throw new Error('jira_base_url is not configured');

  // Simple HEAD ping to the Jira base URL — no auth required to check reachability
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${baseUrl}/rest/api/2/serverInfo`, {
      signal: controller.signal,
      headers: cfg.xray_auth_mode === 'server' && cfg.jira_user_email
        ? { Authorization: 'Basic ' + Buffer.from(`${cfg.jira_user_email}:${cfg.jira_api_token}`).toString('base64') }
        : {},
    });
    if (!res.ok && res.status !== 401) {
      throw new Error(`Server responded with HTTP ${res.status}`);
    }
    return { ok: true, status: res.status, message: res.status === 401 ? 'Reachable (auth required)' : 'Connected' };
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Connection timed out after 8 s');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getAll, setMany, testConnection };
