const router = require('express').Router();
const ctrl   = require('../controllers/drilldownController');
router.get('/kpis',        ctrl.getKpis);
router.get('/top-failing', ctrl.getTopFailing);
router.get('/flaky',       ctrl.getFlakyTests);
router.get('/recent',      ctrl.getRecent);
router.get('/type-summary',ctrl.getTypeSummary);
module.exports = router;
