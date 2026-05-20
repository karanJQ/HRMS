const router = require('express').Router();
const ctrl = require('../controllers/apar.controller');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/authorize');

router.get('/', auth, ctrl.list);
router.post('/initiate', auth, allow('super_admin','hr_manager','hr_staff'), ctrl.initiate);
router.put('/:id/self', auth, ctrl.fillSelf);
router.put('/:id/reporting', auth, allow('super_admin','hr_manager','dept_head'), ctrl.fillReporting);
router.put('/:id/reviewing', auth, allow('super_admin','hr_manager'), ctrl.fillReviewing);

module.exports = router;