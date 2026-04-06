const router = require('express').Router();
const ctrl   = require('../controllers/metricsController');

router.get('/kpis',                ctrl.getKpis);
router.get('/pass-rate-trend',     ctrl.getPassRateTrend);
router.get('/outcomes-by-release', ctrl.getOutcomesByRelease);
router.get('/heatmap',             ctrl.getHeatmap);
router.get('/release-summary',     ctrl.getReleaseSummary);
router.get('/defect-trend',        ctrl.getDefectTrend);

module.exports = router;
