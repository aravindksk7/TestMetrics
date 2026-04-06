const fs            = require('fs');
const db            = require('../config/database');
const xlsxIngester  = require('../ingestion/sources/xlsxIngester');
const xrayIngester  = require('../ingestion/sources/xrayApiIngester');

// In-memory cache so status checks don't require a DB round-trip for in-flight jobs
const jobs = new Map();

exports.startIngestion = async (req, res) => {
  const { source = 'xlsx' } = req.body || {};
  if (!['xlsx', 'xray'].includes(source)) {
    return res.status(400).json({ error: 'source must be "xlsx" or "xray"' });
  }

  // Insert initial row into DB
  const { rows } = await db.query(
    `INSERT INTO ingest_jobs (source, status, started_at)
     VALUES ($1, 'running', NOW())
     RETURNING job_id, started_at`,
    [source]
  );
  const { job_id, started_at } = rows[0];

  const job = { job_id, status: 'running', source, started_at, rows_processed: 0, duration_ms: null, errors: [] };
  jobs.set(job_id, job);

  const ingester = source === 'xray' ? xrayIngester : xlsxIngester;
  ingester.run()
    .then(async (summary) => {
      job.status         = 'done';
      job.rows_processed = summary.inserted;
      job.duration_ms    = summary.duration_ms;
      job.errors         = summary.errors;

      await db.query(
        `UPDATE ingest_jobs
         SET status = 'done', completed_at = NOW(),
             rows_processed = $1, duration_ms = $2, errors = $3
         WHERE job_id = $4`,
        [summary.inserted, summary.duration_ms, summary.errors, job_id]
      );
      // Write last_synced_at to app_config
      await db.query(
        `INSERT INTO app_config (key, value, updated_at) VALUES
           ('last_synced_at',   NOW()::TEXT,          NOW()),
           ('last_sync_rows',   $1::TEXT,             NOW()),
           ('last_sync_status', 'done',               NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [summary.inserted]
      );
    })
    .catch(async (err) => {
      job.status = 'error';
      job.errors = [err.message];

      await db.query(
        `UPDATE ingest_jobs
         SET status = 'error', completed_at = NOW(), errors = $1
         WHERE job_id = $2`,
        [[err.message], job_id]
      );
      await db.query(
        `INSERT INTO app_config (key, value, updated_at)
         VALUES ('last_sync_status', 'error', NOW())
         ON CONFLICT (key) DO UPDATE SET value = 'error', updated_at = NOW()`
      );
    });

  res.status(202).json({ job_id });
};

exports.getJobStatus = async (req, res) => {
  // Check in-memory first (in-flight jobs), fall back to DB
  const cached = jobs.get(req.params.job_id);
  if (cached) return res.json(cached);

  const { rows } = await db.query(
    'SELECT * FROM ingest_jobs WHERE job_id = $1',
    [req.params.job_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Job not found' });
  res.json(rows[0]);
};

exports.uploadAndIngest = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = req.file.path;

  const { rows } = await db.query(
    `INSERT INTO ingest_jobs (source, status, started_at)
     VALUES ('xlsx-upload', 'running', NOW())
     RETURNING job_id, started_at`,
  );
  const { job_id, started_at } = rows[0];

  const job = { job_id, status: 'running', source: 'xlsx-upload', started_at, rows_processed: 0, duration_ms: null, errors: [] };
  jobs.set(job_id, job);

  res.status(202).json({ job_id });

  // Run ingestion after response is sent
  xlsxIngester.run({ filePath })
    .then(async (summary) => {
      job.status         = 'done';
      job.rows_processed = summary.inserted;
      job.duration_ms    = summary.duration_ms;
      job.errors         = summary.errors;

      await db.query(
        `UPDATE ingest_jobs SET status='done', completed_at=NOW(),
         rows_processed=$1, duration_ms=$2, errors=$3 WHERE job_id=$4`,
        [summary.inserted, summary.duration_ms, summary.errors, job_id]
      );
      await db.query(
        `INSERT INTO app_config (key, value, updated_at) VALUES
           ('last_synced_at',   NOW()::TEXT, NOW()),
           ('last_sync_rows',   $1::TEXT,    NOW()),
           ('last_sync_status', 'done',      NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [summary.inserted]
      );
    })
    .catch(async (err) => {
      job.status = 'error';
      job.errors = [err.message];
      await db.query(
        `UPDATE ingest_jobs SET status='error', completed_at=NOW(), errors=$1 WHERE job_id=$2`,
        [[err.message], job_id]
      );
    })
    .finally(() => {
      // Clean up temp file
      fs.unlink(filePath, () => {});
    });
};

exports.getHistory = async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT job_id, source, status, started_at, completed_at,
              rows_processed, duration_ms, errors
       FROM ingest_jobs
       ORDER BY started_at DESC
       LIMIT 20`
    );
    res.json({ jobs: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
