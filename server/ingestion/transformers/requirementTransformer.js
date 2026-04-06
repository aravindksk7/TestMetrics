const PRIORITY_MAP = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

function transformRequirement(row) {
  const raw = (row['Priority'] || row['priority'] || 'Medium').toUpperCase();
  return {
    req_key:     row['Requirement Key'] || row['key']     || row['issueKey'],
    req_summary: row['Summary']         || row['summary'] || '',
    priority:    PRIORITY_MAP[raw] ?? 'Medium',
    release_name: row['Fix Version']   || row['fixVersion'] || row['release'],
    test_key:     row['Linked Test']   || row['linkedTest'] || null,
    is_covered:   Boolean(row['Linked Test'] || row['linkedTest']),
  };
}

module.exports = { transformRequirement };
