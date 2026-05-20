const router = require('express').Router();
const ctrl = require('../controllers/onboarding.controller');
const auth = require('../middleware/auth');
const { minRole } = require('../middleware/authorize');

router.get('/', auth, minRole('hr_staff'), ctrl.list);
router.post('/', auth, minRole('hr_staff'), ctrl.create);
router.put('/:id', auth, minRole('hr_staff'), ctrl.update);

module.exports = router;