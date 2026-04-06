const router = require('express').Router();
const ctrl   = require('../controllers/portfolioController');

router.get('/program-health',    ctrl.getProgramHealth);
router.get('/coverage',          ctrl.getCoverage);
router.get('/program-trend',     ctrl.getProgramTrend);
router.get('/app-health',        ctrl.getAppHealth);
router.get('/defects-by-program', ctrl.getDefectsByProgram);

module.exports = router;
