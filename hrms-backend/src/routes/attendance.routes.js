const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { isAdminOrHR } = require('../middleware/roles');

router.use(auth);

router.get('/', attendanceController.getAttendance);
router.post('/punch', logAudit('PUNCH', 'Attendance'), attendanceController.punch);
router.post('/sync', logAudit('SYNC_BIOMETRICS', 'Attendance'), attendanceController.syncBiometrics);

router.post('/regularize', logAudit('APPLY_REGULARIZATION', 'Attendance'), attendanceController.applyRegularization);
router.get('/regularize', attendanceController.getRegularization);
router.put('/regularize/:id', isAdminOrHR, logAudit('REVIEW_REGULARIZATION', 'Attendance'), attendanceController.reviewRegularization);

router.get('/settings', attendanceController.getSettings);
router.put('/settings', isAdminOrHR, logAudit('UPDATE_SETTINGS', 'Attendance'), attendanceController.updateSettings);

module.exports = router;
