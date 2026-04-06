const router = require('express').Router();
const ctrl   = require('../controllers/traceabilityController');
router.get('/kpis',             ctrl.getKpis);
router.get('/coverage-release', ctrl.getCoverageByRelease);
router.get('/coverage-priority',ctrl.getCoverageByPriority);
router.get('/uncovered',        ctrl.getUncoveredReqs);
router.get('/req-performance',  ctrl.getReqPerformance);
module.exports = router;
