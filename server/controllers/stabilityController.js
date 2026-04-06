const svc = require('../services/stabilityService');

function wrap(fn) {
  return async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { console.error('[stability]', err.message); res.status(500).json({ error: err.message }); }
  };
}

exports.getKpis          = wrap(() => svc.getStabilityKpis());
exports.getSummary       = wrap(() => svc.getEnvironmentSummary());
exports.getBlockedTrend  = wrap(() => svc.getEnvBlockedTrend());
exports.getProgramEnv    = wrap(() => svc.getProgramEnvStability());
