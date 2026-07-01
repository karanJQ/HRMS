const router = require('express').Router();
const ctrl = require('../controllers/resignation.controller');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/authorize');

router.get('/', auth, ctrl.list);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, allow('super_admin', 'hr_manager', 'hr_staff'), ctrl.update);
router.get('/:id/leaves', auth, ctrl.getNoticeLeaves);

module.exports = router;
