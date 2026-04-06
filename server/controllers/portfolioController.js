const svc = require('../services/portfolioService');

function wrap(fn) {
  return async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { console.error('[portfolio]', err.message); res.status(500).json({ error: err.message }); }
  };
}

exports.getProgramHealth   = wrap(() => svc.getProgramHealth());
exports.getCoverage        = wrap(() => svc.getPortfolioCoverage().then((v) => ({ coverage_pct: v })));
exports.getProgramTrend    = wrap(() => svc.getProgramTrend());
exports.getAppHealth       = wrap(() => svc.getAppHealth());
exports.getDefectsByProgram = wrap(() => svc.getDefectsByProgram());
