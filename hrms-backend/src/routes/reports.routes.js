const router = require('express').Router();
const ctrl = require('../controllers/reports.controller');
const auth = require('../middleware/auth');
const { minRole } = require('../middleware/authorize');

router.get('/dashboard', auth, ctrl.dashboard);
router.get('/headcount', auth, minRole('hr_staff'), ctrl.headcount);
router.get('/payroll', auth, minRole('hr_staff'), ctrl.payrollReport);
router.get('/leave', auth, minRole('hr_staff'), ctrl.leaveReport);
router.get('/retirement', auth, minRole('hr_staff'), ctrl.retirementReport);
router.get('/probation-alerts', auth, minRole('hr_staff'), ctrl.getProbationAlerts);

module.exports = router;