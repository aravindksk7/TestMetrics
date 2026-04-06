const router = require('express').Router({ mergeParams: true });
const ctrl   = require('../controllers/releaseController');

router.get('/:releaseId',           ctrl.getSummary);
router.get('/:releaseId/breakdown', ctrl.getBreakdown);
router.get('/:releaseId/trend',     ctrl.getTrend);
router.get('/:releaseId/defects',   ctrl.getDefects);

module.exports = router;
