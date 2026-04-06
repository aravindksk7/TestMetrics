-- App configuration key-value store
CREATE TABLE IF NOT EXISTS app_config (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default config keys (no credentials)
INSERT INTO app_config (key, value) VALUES
  ('jira_base_url',       ''),
  ('jira_project_key',    ''),
  ('xray_auth_mode',      'server'),  -- 'server' | 'cloud'
  ('jira_user_email',     ''),
  ('jira_api_token',      ''),
  ('xray_client_id',      ''),
  ('xray_client_secret',  ''),
  ('last_synced_at',      NULL),
  ('last_sync_rows',      NULL),
  ('last_sync_status',    NULL)
ON CONFLICT (key) DO NOTHING;

-- Ingestion job history (persistent, survives restarts)
CREATE TABLE IF NOT EXISTS ingest_jobs (
  job_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        VARCHAR(20)  NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'running',
  started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  rows_processed INT,
  duration_ms   INT,
  errors        TEXT[]       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ingest_jobs_started ON ingest_jobs (started_at DESC);
