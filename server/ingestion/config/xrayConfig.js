require('dotenv').config();

const isCloud = Boolean(process.env.XRAY_CLIENT_ID && process.env.XRAY_CLIENT_SECRET);

let _cachedToken = null;
let _tokenExpiry  = 0;

async function getAuthHeader() {
  if (isCloud) {
    if (Date.now() < _tokenExpiry && _cachedToken) {
      return `Bearer ${_cachedToken}`;
    }
    const res = await fetch('https://xray.cloud.getxray.app/api/v2/authenticate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        client_id:     process.env.XRAY_CLIENT_ID,
        client_secret: process.env.XRAY_CLIENT_SECRET,
      }),
    });
    if (!res.ok) throw new Error(`Xray auth failed: ${res.status}`);
    _cachedToken = (await res.json()).replace(/^"|"$/g, '');
    _tokenExpiry  = Date.now() + 55 * 60 * 1000;  // 55 min (token valid 60 min)
    return `Bearer ${_cachedToken}`;
  }

  // Server / DC — Basic auth
  const { JIRA_USER_EMAIL, JIRA_API_TOKEN } = process.env;
  if (!JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
    throw new Error('Set JIRA_USER_EMAIL + JIRA_API_TOKEN (Server/DC) or XRAY_CLIENT_ID + XRAY_CLIENT_SECRET (Cloud)');
  }
  return 'Basic ' + Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
}

const BASE_URL     = process.env.JIRA_BASE_URL || '';
const XRAY_CLOUD   = 'https://xray.cloud.getxray.app/api/v2';
const PROJECT_KEY  = process.env.JIRA_PROJECT_KEY || '';

module.exports = { isCloud, getAuthHeader, BASE_URL, XRAY_CLOUD, PROJECT_KEY };
