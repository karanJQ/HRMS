const router = require('express').Router();
const ctrl = require('../controllers/grievance.controller');
const auth = require('../middleware/auth');
const { allow, minRole } = require('../middleware/authorize');

router.get('/', auth, ctrl.list);
router.post('/', auth, ctrl.create);
router.put('/:id/assign', auth, minRole('hr_staff'), ctrl.assign);
router.put('/:id/resolve', auth, minRole('hr_staff'), ctrl.resolve);
router.get('/disciplinary', auth, minRole('hr_staff'), ctrl.listDisc);
router.post('/disciplinary', auth, minRole('hr_staff'), ctrl.createDisc);
router.put('/disciplinary/:id', auth, minRole('hr_staff'), ctrl.updateDisc);

module.exports = router;