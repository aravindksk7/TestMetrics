const svc = require('../services/configService');

function wrap(fn) {
  return async (req, res) => {
    try {
      res.json(await fn(req));
    } catch (err) {
      console.error('[config]', err.message);
      res.status(500).json({ error: err.message });
    }
  };
}

exports.getConfig  = wrap(() => svc.getAll());
exports.saveConfig = wrap((req) => {
  if (!req.body || typeof req.body !== 'object') throw new Error('Invalid body');
  return svc.setMany(req.body).then(() => ({ ok: true }));
});
exports.testConnection = wrap(() => svc.testConnection());
