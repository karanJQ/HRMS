const router = require('express').Router();
const ctrl = require('../controllers/transfer.controller');
const auth = require('../middleware/auth');
const { allow, minRole } = require('../middleware/authorize');

router.get('/', auth, ctrl.list);
router.post('/', auth, minRole('hr_staff'), ctrl.create);
router.put('/:id/approve', auth, allow('super_admin','hr_manager'), ctrl.approve);
router.put('/:id/reject', auth, allow('super_admin','hr_manager'), ctrl.reject);

module.exports = router;