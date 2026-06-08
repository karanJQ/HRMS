const router = require('express').Router();
const ctrl = require('../controllers/leave.controller');
const auth = require('../middleware/auth');
const { minRole } = require('../middleware/authorize');

router.get('/applications', auth, ctrl.listApplications);
router.post('/applications', auth, ctrl.apply);
router.put('/applications/:id/review', auth, minRole('hr_staff'), ctrl.review);
router.delete('/applications/:id', auth, ctrl.cancelLeave);
router.get('/balances', auth, ctrl.listBalances);
router.get('/my-balances', auth, ctrl.myLeaveBalances);
router.put('/balances/:empId', auth, minRole('hr_staff'), ctrl.updateBalance);

module.exports = router;
