const router = require('express').Router();
const ctrl   = require('../controllers/filterController');

router.get('/releases',     ctrl.getReleases);
router.get('/programs',     ctrl.getPrograms);
router.get('/applications', ctrl.getApplications);
router.get('/environments', ctrl.getEnvironments);
router.get('/date-range',   ctrl.getDateRange);

module.exports = router;
