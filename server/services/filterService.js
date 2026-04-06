const db = require('../config/database');

async function getReleases() {
  const { rows } = await db.query(
    'SELECT release_id, release_name, release_date, status FROM dim_release ORDER BY release_date'
  );
  return rows;
}

async function getPrograms() {
  const { rows } = await db.query(
    'SELECT program_id, program_name FROM dim_program ORDER BY program_name'
  );
  return rows;
}

async function getApplications(programId) {
  if (programId) {
    const { rows } = await db.query(
      'SELECT app_id, app_name, program_id FROM dim_application WHERE program_id = $1 ORDER BY app_name',
      [Number(programId)]
    );
    return rows;
  }
  const { rows } = await db.query(
    'SELECT app_id, app_name, program_id FROM dim_application ORDER BY app_name'
  );
  return rows;
}

async function getEnvironments() {
  const { rows } = await db.query(
    `SELECT env_id, env_name FROM dim_environment
     ORDER BY CASE env_name WHEN 'DEV' THEN 1 WHEN 'SIT' THEN 2
              WHEN 'UAT' THEN 3 WHEN 'PERF' THEN 4 WHEN 'PROD' THEN 5 ELSE 6 END`
  );
  return rows;
}

async function getDateRange() {
  const { rows: [row] } = await db.query(
    'SELECT MIN(full_date) AS min_date, MAX(full_date) AS max_date FROM dim_date'
  );
  return {
    min_date: row.min_date?.toISOString().slice(0, 10) ?? '2024-01-01',
    max_date: row.max_date?.toISOString().slice(0, 10) ?? '2026-04-30',
  };
}

module.exports = { getReleases, getPrograms, getApplications, getEnvironments, getDateRange };
