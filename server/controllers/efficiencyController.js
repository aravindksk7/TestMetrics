const svc = require('../services/efficiencyService');

function wrap(fn) {
  return async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { console.error('[efficiency]', err.message); res.status(500).json({ error: err.message }); }
  };
}

exports.getKpis           = wrap(() => svc.getEfficiencyKpis());
exports.getThroughput     = wrap(() => svc.getThroughputTrend());
exports.getAutomationSplit = wrap(() => svc.getAutomationSplit());
exports.getFlakyTests     = wrap(() => svc.getFlakyTests());
