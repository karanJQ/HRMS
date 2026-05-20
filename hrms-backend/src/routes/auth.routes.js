const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const { allow, minRole } = require('../middleware/authorize');

router.post('/login', ctrl.login);
router.get('/me', auth, ctrl.me);
router.put('/change-password', auth, ctrl.changePassword);
router.get('/users', auth, allow('super_admin'), ctrl.listUsers);
router.post('/users', auth, allow('super_admin'), ctrl.createUser);
router.put('/users/:id/toggle', auth, allow('super_admin'), ctrl.toggleUser);

module.exports = router;