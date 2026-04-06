/**
 * Converts a filter object into a parameterized SQL WHERE clause fragment.
 * NEVER concatenates user values into SQL text — always uses $n placeholders.
 *
 * @param {object} filters  - { release_id, program_id, app_id, env_id, date_from, date_to }
 * @param {number} startAt  - starting $n index (default 1)
 * @returns {{ clause: string, params: any[], nextIndex: number }}
 */
function buildWhereClause(filters = {}, startAt = 1) {
  const conditions = [];
  const params = [];
  let n = startAt;

  if (filters.release_id) {
    params.push(Number(filters.release_id));
    conditions.push(`fte.release_id = $${n++}`);
  }
  if (filters.program_id) {
    params.push(Number(filters.program_id));
    conditions.push(`fte.program_id = $${n++}`);
  }
  if (filters.app_id) {
    params.push(Number(filters.app_id));
    conditions.push(`fte.app_id = $${n++}`);
  }
  if (filters.env_id) {
    params.push(Number(filters.env_id));
    conditions.push(`fte.env_id = $${n++}`);
  }
  if (filters.date_from) {
    params.push(filters.date_from);
    conditions.push(`dd.full_date >= $${n++}`);
  }
  if (filters.date_to) {
    params.push(filters.date_to);
    conditions.push(`dd.full_date <= $${n++}`);
  }

  return {
    clause:    conditions.length ? 'AND ' + conditions.join(' AND ') : '',
    params,
    nextIndex: n,
  };
}

/**
 * Same as buildWhereClause but uses release-level alias (no date join needed).
 * Used for queries on v_rri and related views.
 */
function buildReleaseWhereClause(filters = {}, startAt = 1) {
  const conditions = [];
  const params = [];
  let n = startAt;

  if (filters.release_id) {
    params.push(Number(filters.release_id));
    conditions.push(`release_id = $${n++}`);
  }

  return {
    clause:    conditions.length ? 'AND ' + conditions.join(' AND ') : '',
    params,
    nextIndex: n,
  };
}

/**
 * WHERE clause for queries against v_execution_summary (aliased as es).
 * Supports release_id, program_id, env_id — no app_id or date (view collapses those).
 */
function buildViewWhereClause(filters = {}, startAt = 1) {
  const conditions = [];
  const params = [];
  let n = startAt;

  if (filters.release_id) {
    params.push(Number(filters.release_id));
    conditions.push(`es.release_id = $${n++}`);
  }
  if (filters.program_id) {
    params.push(Number(filters.program_id));
    conditions.push(`es.program_id = $${n++}`);
  }
  if (filters.env_id) {
    params.push(Number(filters.env_id));
    conditions.push(`es.env_id = $${n++}`);
  }

  return {
    clause:    conditions.length ? 'AND ' + conditions.join(' AND ') : '',
    params,
    nextIndex: n,
  };
}

module.exports = { buildWhereClause, buildReleaseWhereClause, buildViewWhereClause };
