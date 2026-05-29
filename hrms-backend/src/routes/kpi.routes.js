const router = require('express').Router();
const ctrl   = require('../controllers/kpi.controller');
const auth   = require('../middleware/auth');
const { allow } = require('../middleware/authorize');

// Cycles
router.get('/cycles',  auth, ctrl.listCycles);
router.post('/cycles', auth, allow('super_admin','hr_manager'), ctrl.createCycle);

// Reports
router.get('/reports',     auth, ctrl.listReports);
router.post('/reports',    auth, allow('super_admin','hr_manager','dept_head'), ctrl.createReport);
router.get('/reports/:id', auth, ctrl.getReport);

// Items (manager fills)
router.put('/reports/:id/items',  auth, allow('super_admin','hr_manager','dept_head'), ctrl.saveItems);

// Submit
router.put('/reports/:id/submit', auth, allow('super_admin','hr_manager','dept_head'), ctrl.submitReport);

// Approval chain — tree nodes
router.put('/reports/:id/cpo',     auth, allow('super_admin','hr_manager'), ctrl.cpoAction);
router.put('/reports/:id/coo',     auth, allow('super_admin'), ctrl.cooAction);
router.put('/reports/:id/md',      auth, allow('super_admin'), ctrl.mdAction);
router.put('/reports/:id/publish', auth, allow('super_admin'), ctrl.publishReport);

// AI Insights
router.get('/reports/:id/ai-insights', auth, allow('super_admin','hr_manager','dept_head'), ctrl.generateAIInsights);

module.exports = router;
