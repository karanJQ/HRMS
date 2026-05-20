const router = require('express').Router();
const ctrl = require('../controllers/leave.controller');
const auth = require('../middleware/auth');
const { allow, minRole } = require('../middleware/authorize');

router.get('/applications', auth, ctrl.listApplications);
router.post('/applications', auth, ctrl.apply);
router.put('/applications/:id/review', auth, minRole('hr_staff'), ctrl.review);
router.get('/balances', auth, ctrl.listBalances);

module.exports = router;