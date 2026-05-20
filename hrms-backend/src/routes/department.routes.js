const router = require('express').Router();
const ctrl = require('../controllers/department.controller');
const auth = require('../middleware/auth');
const { allow, minRole } = require('../middleware/authorize');

router.get('/', auth, ctrl.list);
router.post('/', auth, allow('super_admin','hr_manager'), ctrl.create);
router.put('/:id', auth, allow('super_admin','hr_manager'), ctrl.update);
router.get('/designations', auth, ctrl.designations);

module.exports = router;