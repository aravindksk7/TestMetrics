const STATUS_MAP = {
  PASS: 'PASS', PASSED: 'PASS',
  FAIL: 'FAIL', FAILED: 'FAIL',
  BLOCKED: 'BLOCKED', ABORTED: 'BLOCKED',
  EXECUTING: 'IN_PROGRESS', TODO: 'IN_PROGRESS',
  'IN PROGRESS': 'IN_PROGRESS', INPROGRESS: 'IN_PROGRESS',
};

function normalizeStatus(raw) {
  return STATUS_MAP[(raw ?? '').toUpperCase().replace(/\s+/g, ' ').trim()] ?? 'IN_PROGRESS';
}

function transformExecution(row) {
  return {
    test_key:       row['Test Key']          || row['testKey']    || row['key'],
    release_name:   row['Fix Version']       || row['fixVersion'] || row['release'],
    program_name:   row['Program']           || row['program'],
    env_name:       row['Environment']       || row['environment'] || row['env'],
    app_name:       row['Component']         || row['component']  || row['application'],
    status:         normalizeStatus(row['Execution Status'] || row['status']),
    execution_date: parseDate(row['Executed On'] || row['executedOn'] || row['date']),
  };
}

function parseDate(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  // Excel serial number
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
}

module.exports = { transformExecution, normalizeStatus, parseDate };
