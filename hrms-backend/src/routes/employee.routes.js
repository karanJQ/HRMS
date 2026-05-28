const router = require('express').Router();
const ctrl = require('../controllers/employee.controller');
const auth = require('../middleware/auth');
const { allow, minRole } = require('../middleware/authorize');

router.get('/me', auth, ctrl.myProfile);
router.get('/birthdays', auth, ctrl.getBirthdays);
router.get('/anniversaries', auth, ctrl.getAnniversaries);
router.get('/', auth, minRole('hr_staff'), ctrl.list);
router.get('/:empId', auth, ctrl.get);
router.post('/', auth, allow('super_admin','hr_manager','hr_staff'), ctrl.create);
router.put('/:empId', auth, minRole('hr_staff'), ctrl.update);

module.exports = router;