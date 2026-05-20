const router = require('express').Router();
const ctrl = require('../controllers/payroll.controller');
const auth = require('../middleware/auth');
const { allow, minRole } = require('../middleware/authorize');

router.get('/', auth, ctrl.list);
router.get('/slip/:empId/:month/:year', auth, ctrl.getSlip);
router.post('/process', auth, allow('super_admin','hr_manager','hr_staff'), ctrl.process);
router.post('/process-all', auth, allow('super_admin','hr_manager'), ctrl.processAll);
router.post('/mark-paid', auth, allow('super_admin','hr_manager'), ctrl.markPaid);

module.exports = router;