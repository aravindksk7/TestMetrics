const svc = require('../services/filterService');

const wrap = (fn) => async (req, res) => {
  try { res.json(await fn(req, res)); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getReleases     = wrap(async () => ({ releases:     await svc.getReleases()                          }));
exports.getPrograms     = wrap(async () => ({ programs:     await svc.getPrograms()                          }));
exports.getApplications = wrap(async (req) => ({ applications: await svc.getApplications(req.query.program_id) }));
exports.getEnvironments = wrap(async () => ({ environments: await svc.getEnvironments()                      }));
exports.getDateRange    = wrap(async () =>                        svc.getDateRange()                           );
