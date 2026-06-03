const router = require('express').Router();
const ctrl = require('../controllers/announcement.controller');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/authorize');

router.get('/', auth, ctrl.list);
router.post('/', auth, allow('super_admin', 'hr_manager', 'hr_staff'), ctrl.create);
router.delete('/:id', auth, allow('super_admin', 'hr_manager', 'hr_staff'), ctrl.delete);

module.exports = router;
