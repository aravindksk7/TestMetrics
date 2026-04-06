const svc = require('../services/releaseService');

const wrap = (fn) => async (req, res) => {
  try {
    const result = await fn(req);
    if (result === null) return res.status(404).json({ error: 'Release not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSummary   = wrap((req) => svc.getReleaseSummaryById(req.params.releaseId));
exports.getBreakdown = wrap((req) => svc.getReleaseBreakdown(req.params.releaseId));
exports.getTrend     = wrap((req) => svc.getReleaseTrend(req.params.releaseId));
exports.getDefects   = wrap((req) => svc.getReleaseDefects(req.params.releaseId));
