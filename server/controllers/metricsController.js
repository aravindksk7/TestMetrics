const svc = require('../services/metricsService');

const FILTER_KEYS = ['release_id', 'program_id', 'app_id', 'env_id', 'date_from', 'date_to'];

function pickFilters(query) {
  return Object.fromEntries(
    FILTER_KEYS.map((k) => [k, query[k] || '']).filter(([, v]) => v !== '')
  );
}

const wrap = (fn) => async (req, res) => {
  try { res.json(await fn(pickFilters(req.query))); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getKpis              = wrap(svc.getKpis);
exports.getPassRateTrend     = wrap(svc.getPassRateTrend);
exports.getOutcomesByRelease = wrap(svc.getOutcomesByRelease);
exports.getHeatmap           = wrap(svc.getHeatmap);
exports.getReleaseSummary    = wrap(svc.getReleaseSummary);
exports.getDefectTrend       = wrap(svc.getDefectTrend);
