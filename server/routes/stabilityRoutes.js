const router = require('express').Router();
const ctrl   = require('../controllers/stabilityController');
router.get('/kpis',         ctrl.getKpis);
router.get('/summary',      ctrl.getSummary);
router.get('/blocked-trend',ctrl.getBlockedTrend);
router.get('/program-env',  ctrl.getProgramEnv);
module.exports = router;
