const svc = require('../services/traceabilityService');

function wrap(fn) {
  return async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { console.error('[traceability]', err.message); res.status(500).json({ error: err.message }); }
  };
}

exports.getKpis           = wrap(() => svc.getTraceabilityKpis());
exports.getCoverageByRelease   = wrap(() => svc.getCoverageByRelease());
exports.getCoverageByPriority  = wrap(() => svc.getCoverageByPriority());
exports.getUncoveredReqs  = wrap(() => svc.getUncoveredRequirements());
exports.getReqPerformance = wrap(() => svc.getRequirementTestPerformance());
