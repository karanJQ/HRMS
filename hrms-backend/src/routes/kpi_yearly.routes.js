const router = require('express').Router();
const ctrl   = require('../controllers/kpi_yearly.controller');
const auth   = require('../middleware/auth');
const { allow } = require('../middleware/authorize');

// ─── Cycles ───────────────────────────────────────────────────────────────────
router.get('/cycles',  auth, ctrl.listCycles);
router.post('/cycles', auth, allow('super_admin', 'hr_manager'), ctrl.createCycle);

// ─── Reports ──────────────────────────────────────────────────────────────────
// Any authenticated user can list/get — controller scopes what they see
router.get('/reports',     auth, ctrl.listReports);
// Any authenticated user can create — controller verifies they are the employee's reporting manager
router.post('/reports',    auth, ctrl.createReport);
router.get('/reports/:id', auth, ctrl.getReport);
router.delete('/reports/:id', auth, ctrl.deleteReport);

// ─── Goals — controller verifies reporting_manager_id match (any role) ────────
router.put('/reports/:id/goals',                auth, ctrl.saveGoals);
router.put('/reports/:id/finalize-goals',       auth, ctrl.finalizeGoals);
router.put('/reports/:id/unfreeze-goals',       auth, ctrl.unfreezeGoals);
router.put('/reports/:id/open-self-assessment', auth, ctrl.openSelfAssessment);

// ─── Self Assessment (Employee — controller verifies emp_id) ─────────────────
router.put('/reports/:id/self-assess', auth, ctrl.saveSelfAssessment);
router.put('/reports/:id/submit-self', auth, ctrl.submitSelfAssessment);

// ─── Manager Review — controller verifies reporting_manager_id match ──────────
router.put('/reports/:id/manager-review', auth, ctrl.managerReview);

// ─── CPO / Sales Lead / MD — role gated (these are actual org-level roles) ───
router.put('/reports/:id/cpo',        auth, allow('super_admin', 'hr_manager'), ctrl.cpoAction);
router.put('/reports/:id/sales-lead', auth, ctrl.salesLeadAction);   // controller will validate designation
router.put('/reports/:id/md',         auth, allow('super_admin'), ctrl.mdAction);
router.put('/reports/:id/publish',    auth, allow('super_admin'), ctrl.publishReport);

// ─── KRA Discussion ───────────────────────────────────────────────────────────
router.post('/reports/:id/kra', auth, allow('super_admin', 'hr_manager'), ctrl.recordKRADiscussion);

// ─── AI Insights ──────────────────────────────────────────────────────────────
router.get('/reports/:id/ai-insights', auth, ctrl.generateAIInsights);

module.exports = router;

