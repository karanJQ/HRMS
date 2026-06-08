const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { isAdminOrHR } = require('../middleware/roles');
const { minRole } = require('../middleware/authorize');

router.use(auth);

// Core attendance routes
router.get('/', attendanceController.getAttendance);
router.get('/export', attendanceController.exportCSV);
router.get('/calendar', attendanceController.getCalendar);
router.get('/stats', attendanceController.getMonthlyStats);
router.get('/team-calendar', attendanceController.getTeamCalendar);
router.post('/punch', logAudit('PUNCH', 'Attendance'), attendanceController.punch);
router.post('/sync', logAudit('SYNC_BIOMETRICS', 'Attendance'), attendanceController.syncBiometrics);

// Regularization routes
router.post('/regularize', logAudit('APPLY_REGULARIZATION', 'Attendance'), attendanceController.applyRegularization);
router.get('/regularize', attendanceController.getRegularization);
router.put('/regularize/:id', minRole('hr_staff'), logAudit('REVIEW_REGULARIZATION', 'Attendance'), attendanceController.reviewRegularization);
router.delete('/regularize/:id', logAudit('CANCEL_REGULARIZATION', 'Attendance'), attendanceController.cancelRegularization);

// WFH routes
router.post('/wfh', logAudit('APPLY_WFH', 'Attendance'), attendanceController.applyWFH);
router.get('/wfh', attendanceController.getWFH);
router.put('/wfh/:id', minRole('hr_staff'), logAudit('REVIEW_WFH', 'Attendance'), attendanceController.reviewWFH);
router.delete('/wfh/:id', logAudit('CANCEL_WFH', 'Attendance'), attendanceController.cancelWFH);

// Holiday routes
router.get('/holidays', attendanceController.getHolidays);
router.post('/holidays', minRole('hr_staff'), logAudit('ADD_HOLIDAY', 'Attendance'), attendanceController.addHoliday);
router.delete('/holidays/:id', minRole('hr_staff'), logAudit('DELETE_HOLIDAY', 'Attendance'), attendanceController.deleteHoliday);

// Settings routes
router.get('/settings', attendanceController.getSettings);
router.put('/settings', minRole('hr_staff'), logAudit('UPDATE_SETTINGS', 'Attendance'), attendanceController.updateSettings);

module.exports = router;
