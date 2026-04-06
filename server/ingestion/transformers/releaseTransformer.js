const { parseDate } = require('./executionTransformer');

const STATUS_MAP = {
  ACTIVE: 'Active', PLANNING: 'Planning',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', RELEASED: 'Completed',
};

function transformRelease(row) {
  const sta = (row['Status'] || row['status'] || 'Active').toUpperCase();
  return {
    release_name:    row['Release'] || row['Name']    || row['name']    || row['fixVersion'],
    release_version: row['Version'] || row['version'] || null,
    release_date:    parseDate(row['Release Date'] || row['releaseDate'] || row['date']),
    status:          STATUS_MAP[sta] ?? 'Active',
  };
}

module.exports = { transformRelease };
