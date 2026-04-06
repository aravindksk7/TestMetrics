const router = require('express').Router();
const ctrl   = require('../controllers/efficiencyController');
router.get('/kpis',             ctrl.getKpis);
router.get('/throughput',       ctrl.getThroughput);
router.get('/automation-split', ctrl.getAutomationSplit);
router.get('/flaky-tests',      ctrl.getFlakyTests);
module.exports = router;
