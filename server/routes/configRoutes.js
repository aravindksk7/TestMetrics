const router = require('express').Router();
const ctrl   = require('../controllers/configController');

router.get('/config',           ctrl.getConfig);
router.put('/config',           ctrl.saveConfig);
router.post('/config/test',     ctrl.testConnection);

module.exports = router;
