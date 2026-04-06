const svc = require('../services/drilldownService');

function wrap(fn) {
  return async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { console.error('[drilldown]', err.message); res.status(500).json({ error: err.message }); }
  };
}

exports.getKpis        = wrap((req) => svc.getDrilldownKpis(req.query));
exports.getTopFailing  = wrap((req) => svc.getTopFailingTests(req.query));
exports.getFlakyTests  = wrap((req) => svc.getFlakyTests(req.query));
exports.getRecent      = wrap((req) => svc.getRecentExecutions(req.query));
exports.getTypeSummary = wrap((req) => svc.getTestTypeSummary(req.query));
