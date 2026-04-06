const { parseDate } = require('./executionTransformer');

const SEVERITY_MAP = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const STATUS_MAP   = {
  OPEN: 'Open', 'IN PROGRESS': 'In Progress', INPROGRESS: 'In Progress',
  RESOLVED: 'Resolved', CLOSED: 'Closed',
};

function transformDefect(row) {
  const sev = (row['Priority'] || row['Severity'] || row['priority'] || 'Medium').toUpperCase();
  const sta = (row['Status']   || row['status']   || 'Open').toUpperCase().replace(/\s+/g, ' ');
  return {
    release_name:  row['Fix Version']   || row['fixVersion'] || row['release'],
    program_name:  row['Program']       || row['program'],
    severity:      SEVERITY_MAP[sev]    ?? 'Medium',
    status:        STATUS_MAP[sta]      ?? 'Open',
    created_date:  parseDate(row['Created']  || row['created']),
    resolved_date: parseDate(row['Resolved'] || row['resolved']) || null,
  };
}

module.exports = { transformDefect };
