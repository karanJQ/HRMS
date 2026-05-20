const router = require('express').Router();
const ctrl = require('../controllers/training.controller');
const auth = require('../middleware/auth');
const { allow, minRole } = require('../middleware/authorize');

router.get('/programs', auth, ctrl.listPrograms);
router.post('/programs', auth, minRole('hr_staff'), ctrl.createProgram);
router.put('/programs/:id', auth, minRole('hr_staff'), ctrl.updateProgram);
router.post('/enroll', auth, minRole('hr_staff'), ctrl.enroll);
router.get('/enrollments', auth, ctrl.listEnrollments);

module.exports = router;