const router = require('express').Router();
const ctrl = require('../controllers/retirement.controller');
const auth = require('../middleware/auth');
const { minRole } = require('../middleware/authorize');

router.get('/', auth, minRole('hr_staff'), ctrl.list);
router.put('/:empId', auth, minRole('hr_staff'), ctrl.update);

module.exports = router;