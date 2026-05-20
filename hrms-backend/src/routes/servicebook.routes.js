const router = require('express').Router();
const ctrl = require('../controllers/servicebook.controller');
const auth = require('../middleware/auth');
const { allow, minRole } = require('../middleware/authorize');

router.get('/:empId', auth, ctrl.getByEmp);
router.post('/:empId', auth, minRole('hr_staff'), ctrl.addEntry);

module.exports = router;