const { query } = require('../config/database');
const { success, error } = require('../utils/response');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Determine which approval stages this employee goes through based on department
const getApprovalChain = (deptName) => {
  if (deptName === 'Sales') {
    return ['reporting_manager', 'sales_lead', 'md'];
  }
  return ['reporting_manager', 'cpo', 'md'];
};

const computeWeightedScore = (items, scoreField) => {
  const total = items.reduce((sum, item) => {
    const w = parseFloat(item.weightage) || 0;
    const s = parseFloat(item[scoreField]) || 0;
    // max w sum is 10, max s is 10. w * s max is 10 * 10 = 100.
    return sum + (w * s);
  }, 0);
  return parseFloat(total.toFixed(2));
};

// Check if the logged-in user is the reporting manager of a given report
// Works for ANY role — matches by user ID on the report
const isReportingManager = (user, report) => {
  return user.id === report.reporting_manager_id;
};

// Elevated roles (HR and above) can act as manager on any report
const isElevatedRole = (user) => {
  return ['super_admin', 'hr_manager', 'dept_head'].includes(user.role);
};

// Combined: is the user authorized to act as reporting manager on this report?
const canActAsManager = (user, report) => {
  return isReportingManager(user, report) || user.role === 'super_admin';
};


// ─── Cycles ───────────────────────────────────────────────────────────────────

exports.listCycles = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM kpi_yearly_cycles ORDER BY year DESC`);
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.createCycle = async (req, res) => {
  const { year, name, start_date, end_date, goal_deadline, self_assessment_deadline } = req.body;
  if (!year || !start_date || !end_date) return error(res, 'year, start_date, end_date are required.', 400);
  const cycleName = name || `FY ${year}-${parseInt(year) + 1}`;
  try {
    const result = await query(
      `INSERT INTO kpi_yearly_cycles(year, name, start_date, end_date, goal_deadline, self_assessment_deadline, created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(year) DO UPDATE
         SET name=$2, start_date=$3, end_date=$4, goal_deadline=$5, self_assessment_deadline=$6, updated_at=NOW()
       RETURNING *`,
      [year, cycleName, start_date, end_date, goal_deadline || null, self_assessment_deadline || null, req.user.id]
    );
    return success(res, result.rows[0], 'Cycle created/updated', 201);
  } catch (err) { return error(res, err.message); }
};

// ─── Reports ──────────────────────────────────────────────────────────────────

exports.listReports = async (req, res) => {
  const { cycle_id, emp_id, status } = req.query;
  const conditions = [], params = [];
  let idx = 1;

  if (cycle_id) { conditions.push(`r.cycle_id=$${idx++}`); params.push(cycle_id); }
  if (emp_id)   { conditions.push(`r.emp_id=$${idx++}`);   params.push(emp_id); }
  if (status)   { conditions.push(`r.status=$${idx++}`);   params.push(status); }

  // Role-based scoping:
  // super_admin and hr_manager see everything
  // dept_head sees their team (by user id as reporting_manager_id)
  // Any user with employee role: see own report AND any reports where they are reporting manager
  if (['super_admin', 'hr_manager'].includes(req.user.role)) {
    // no extra filter — see all
  } else if (req.user.role === 'dept_head') {
    conditions.push(`(r.emp_id=$${idx++} OR r.reporting_manager_id=$${idx++})`);
    params.push(req.user.emp_id, req.user.id);
  } else {
    // employee or hr_staff: see own report OR reports they manage as reporting manager
    conditions.push(`(r.emp_id=$${idx++} OR r.reporting_manager_id=$${idx++})`);
    params.push(req.user.emp_id, req.user.id);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  try {
    const result = await query(
      `SELECT r.*,
              e.first_name||' '||e.last_name AS emp_name,
              e.employee_type,
              d.name AS dept_name,
              des.name AS designation_name,
              um.username AS manager_username,
              um.email AS manager_email,
              c.year, c.name AS cycle_name, c.goal_deadline, c.self_assessment_deadline,
              (SELECT json_agg(a ORDER BY a.created_at)
               FROM kpi_yearly_approvals a WHERE a.report_id = r.id) AS approvals,
              (SELECT row_to_json(kd) FROM kra_discussions kd WHERE kd.report_id = r.id) AS kra_discussion
       FROM kpi_yearly_reports r
       JOIN employees e ON e.emp_id = r.emp_id
       LEFT JOIN departments d ON d.id = e.dept_id
       LEFT JOIN designations des ON des.id = e.designation_id
       JOIN users um ON um.id = r.reporting_manager_id
       JOIN kpi_yearly_cycles c ON c.id = r.cycle_id
       ${where} ORDER BY r.updated_at DESC`,
      params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};


exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const reportCheck = await query('SELECT * FROM kpi_yearly_reports WHERE id = $1', [id]);
    if (!reportCheck.rows.length) return error(res, 'Report not found.', 404);
    const report = reportCheck.rows[0];

    // Authorization: Superadmin or hr_manager can delete any report.
    // Reporting manager can only delete it if it's still in "Draft" state.
    const isElevated = ['super_admin', 'hr_manager'].includes(req.user.role);
    const isManager = req.user.id === report.reporting_manager_id;
    if (!isElevated && !(isManager && report.status === 'Draft')) {
      return error(res, 'Not authorized to delete this report.', 403);
    }

    await query('BEGIN');
    await query('DELETE FROM kra_discussions WHERE report_id = $1', [id]);
    await query('DELETE FROM kpi_yearly_approvals WHERE report_id = $1', [id]);
    await query('DELETE FROM kpi_yearly_items WHERE report_id = $1', [id]);
    await query('DELETE FROM kpi_yearly_reports WHERE id = $1', [id]);
    await query('COMMIT');

    return success(res, null, 'Report deleted successfully');
  } catch (err) {
    await query('ROLLBACK');
    return error(res, err.message);
  }
};

exports.createReport = async (req, res) => {
  const { cycle_id, emp_id } = req.body;
  if (!cycle_id || !emp_id) return error(res, 'cycle_id and emp_id are required.', 400);
  try {
    const empCheck = await query(
      `SELECT e.*, u.id AS user_id FROM employees e LEFT JOIN users u ON u.emp_id = e.emp_id WHERE e.emp_id=$1`,
      [emp_id]
    );
    if (!empCheck.rows.length) return error(res, `Employee '${emp_id}' not found.`, 404);
    const emp = empCheck.rows[0];

    // Authorization: elevated role (dept_head+) OR user is this employee's designated reporting manager
    const userIsElevated = isElevatedRole(req.user);
    const userIsReportingManager = req.user.emp_id && req.user.emp_id === emp.reporting_manager_id;
    if (!userIsElevated && !userIsReportingManager) {
      return error(res, 'Only the designated reporting manager or HR can create a KPI report for this employee.', 403);
    }

    const cycleCheck = await query('SELECT 1 FROM kpi_yearly_cycles WHERE id=$1', [cycle_id]);
    if (!cycleCheck.rows.length) return error(res, 'Cycle not found.', 404);

    const result = await query(
      `INSERT INTO kpi_yearly_reports(cycle_id, emp_id, reporting_manager_id, status)
       VALUES($1,$2,$3,'Draft')
       ON CONFLICT(cycle_id, emp_id) DO NOTHING RETURNING *`,
      [cycle_id, emp_id, req.user.id]
    );
    if (!result.rows.length) return error(res, 'A report for this employee in this cycle already exists.', 409);
    return success(res, result.rows[0], 'KPI yearly report created', 201);
  } catch (err) { return error(res, err.message); }
};


exports.getReport = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query(
      `SELECT r.*,
              e.first_name||' '||e.last_name AS emp_name,
              e.employee_type,
              d.name AS dept_name,
              des.name AS designation_name,
              um.username AS manager_username,
              c.year, c.name AS cycle_name, c.goal_deadline, c.self_assessment_deadline
       FROM kpi_yearly_reports r
       JOIN employees e ON e.emp_id = r.emp_id
       LEFT JOIN departments d ON d.id = e.dept_id
       LEFT JOIN designations des ON des.id = e.designation_id
       JOIN users um ON um.id = r.reporting_manager_id
       JOIN kpi_yearly_cycles c ON c.id = r.cycle_id
       WHERE r.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);

    const itemsRes = await query(
      `SELECT * FROM kpi_yearly_items WHERE report_id=$1 ORDER BY sort_order, id`, [id]
    );
    const approvalsRes = await query(
      `SELECT a.*, u.username AS approver_username
       FROM kpi_yearly_approvals a
       LEFT JOIN users u ON u.id = a.approver_id
       WHERE a.report_id=$1 ORDER BY a.created_at`, [id]
    );
    const kraRes = await query(
      `SELECT kd.*,
              u1.username AS cpo_username,
              u2.username AS md_username
       FROM kra_discussions kd
       LEFT JOIN users u1 ON u1.id = kd.discussed_by_cpo_id
       LEFT JOIN users u2 ON u2.id = kd.discussed_by_md_id
       WHERE kd.report_id=$1`, [id]
    );

    return success(res, {
      ...reportRes.rows[0],
      items: itemsRes.rows,
      approvals: approvalsRes.rows,
      kra_discussion: kraRes.rows[0] || null,
    });
  } catch (err) { return error(res, err.message); }
};

// ─── Goals ────────────────────────────────────────────────────────────────────

exports.saveGoals = async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;
  if (!Array.isArray(items)) return error(res, 'items must be an array.', 400);

  try {
    const reportRes = await query(
      `SELECT r.*, e.employee_type FROM kpi_yearly_reports r JOIN employees e ON e.emp_id = r.emp_id WHERE r.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    if (!canActAsManager(req.user, report)) {
      return error(res, 'Only the reporting manager can edit KPI goals.', 403);
    }

    const editableStatuses = ['Draft', 'Goals Set', 'Returned'];
    if (!editableStatuses.includes(report.status)) {
      return error(res, 'Goals can only be edited in Draft, Goals Set, or Returned status.', 403);
    }

    // Validate weightage sums to 10
    const totalWeight = items.reduce((s, i) => s + parseFloat(i.weightage || 0), 0);
    if (Math.abs(totalWeight - 10) > 0.01) {
      return error(res, `Weightages must sum to 10. Current total: ${totalWeight.toFixed(2)}`, 400);
    }

    // Re-insert items
    await query('DELETE FROM kpi_yearly_items WHERE report_id=$1', [id]);
    for (let i = 0; i < items.length; i++) {
      const { item_name, description, weightage, target } = items[i];
      if (!item_name) continue;
      await query(
        `INSERT INTO kpi_yearly_items(report_id, item_name, description, weightage, target, sort_order)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [id, item_name, description || null, weightage, target || null, i]
      );
    }
    await query(`UPDATE kpi_yearly_reports SET status='Draft', updated_at=NOW() WHERE id=$1`, [id]);
    return success(res, null, 'Goals saved');
  } catch (err) { return error(res, err.message); }
};


exports.finalizeGoals = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query(
      `SELECT r.*, e.employee_type FROM kpi_yearly_reports r JOIN employees e ON e.emp_id = r.emp_id WHERE r.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    if (!canActAsManager(req.user, report)) {
      return error(res, 'Only the reporting manager can finalize goals.', 403);
    }
    if (!['Draft', 'Goals Set'].includes(report.status)) {
      return error(res, 'Only Draft or Goals Set reports can be finalized.', 400);
    }

    const itemCount = await query('SELECT COUNT(*) FROM kpi_yearly_items WHERE report_id=$1', [id]);
    if (parseInt(itemCount.rows[0].count) === 0) {
      return error(res, 'Add at least one KPI item before finalizing.', 400);
    }

    const itemsRes = await query('SELECT weightage FROM kpi_yearly_items WHERE report_id=$1', [id]);
    const totalWeight = itemsRes.rows.reduce((s, i) => s + parseFloat(i.weightage || 0), 0);
    if (Math.abs(totalWeight - 10) > 0.01) {
      return error(res, `Total weight of goals must be exactly 10. Currently it is ${totalWeight.toFixed(1)}`, 400);
    }

    await query(
      `UPDATE kpi_yearly_reports 
       SET status='Goals Set', goals_frozen=TRUE, goals_set_at=NOW(), updated_at=NOW() 
       WHERE id=$1`, [id]
    );
    return success(res, null, 'Goals finalized and frozen. Employee can now self-assess.');
  } catch (err) { return error(res, err.message); }
};


exports.unfreezeGoals = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query('SELECT * FROM kpi_yearly_reports WHERE id=$1', [id]);
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    if (!canActAsManager(req.user, report)) {
      return error(res, 'Only the reporting manager or admin can unfreeze goals.', 403);
    }
    const frozenEditableStatuses = ['Goals Set', 'Self Assessment Open'];
    if (!frozenEditableStatuses.includes(report.status)) {
      return error(res, 'Goals can only be unfrozen during the Goal Setting or Self Assessment phase.', 400);
    }

    await query(
      `UPDATE kpi_yearly_reports SET goals_frozen=FALSE, status='Draft', updated_at=NOW() WHERE id=$1`, [id]
    );
    return success(res, null, 'Goals unfrozen. Manager can now edit them.');
  } catch (err) { return error(res, err.message); }
};


exports.openSelfAssessment = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query('SELECT * FROM kpi_yearly_reports WHERE id=$1', [id]);
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    if (!canActAsManager(req.user, report)) {
      return error(res, 'Only the reporting manager can open self-assessment.', 403);
    }
    if (report.status !== 'Goals Set') {
      return error(res, 'Goals must be finalized before opening self-assessment.', 400);
    }
    await query(
      `UPDATE kpi_yearly_reports SET status='Self Assessment Open', updated_at=NOW() WHERE id=$1`, [id]
    );
    return success(res, null, 'Self-assessment window opened for employee.');
  } catch (err) { return error(res, err.message); }
};


// ─── Self Assessment ──────────────────────────────────────────────────────────

exports.saveSelfAssessment = async (req, res) => {
  const { id } = req.params;
  const { items, employee_remarks } = req.body;
  if (!Array.isArray(items)) return error(res, 'items must be an array.', 400);

  try {
    const reportRes = await query(
      `SELECT r.*, e.employee_type FROM kpi_yearly_reports r JOIN employees e ON e.emp_id = r.emp_id WHERE r.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    if (report.status !== 'Self Assessment Open') {
      return error(res, 'Self-assessment can only be filled when the window is open.', 403);
    }
    // Gate: only the employee themselves
    if (req.user.emp_id !== report.emp_id && req.user.role !== 'super_admin') {
      return error(res, 'Only the employee can fill their self-assessment.', 403);
    }

    // Update self scores on existing items
    for (const item of items) {
      if (item.id) {
        await query(
          `UPDATE kpi_yearly_items SET self_score=$1, self_remarks=$2, updated_at=NOW() WHERE id=$3 AND report_id=$4`,
          [item.self_score ?? null, item.self_remarks || null, item.id, id]
        );
      }
    }

    // Recompute self overall score
    const updatedItems = await query('SELECT * FROM kpi_yearly_items WHERE report_id=$1', [id]);
    const selfScore = computeWeightedScore(updatedItems.rows, 'self_score');

    await query(
      `UPDATE kpi_yearly_reports SET overall_self_score=$1, employee_remarks=$2, updated_at=NOW() WHERE id=$3`,
      [selfScore, employee_remarks || null, id]
    );
    return success(res, { overall_self_score: selfScore }, 'Self-assessment saved');
  } catch (err) { return error(res, err.message); }
};

exports.submitSelfAssessment = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query(
      `SELECT r.*, e.employee_type FROM kpi_yearly_reports r JOIN employees e ON e.emp_id = r.emp_id WHERE r.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    if (report.status !== 'Self Assessment Open') {
      return error(res, 'Self-assessment window is not open.', 400);
    }
    if (req.user.emp_id !== report.emp_id && req.user.role !== 'super_admin') {
      return error(res, 'Only the employee can submit their self-assessment.', 403);
    }

    // Check all items have self scores
    const itemsCheck = await query(
      `SELECT COUNT(*) AS total, COUNT(self_score) AS scored FROM kpi_yearly_items WHERE report_id=$1`, [id]
    );
    const { total, scored } = itemsCheck.rows[0];
    if (parseInt(total) === 0) return error(res, 'No KPI items found.', 400);
    if (parseInt(scored) < parseInt(total)) {
      return error(res, `Please fill all self-assessment scores (${scored}/${total} done).`, 400);
    }

    await query(
      `UPDATE kpi_yearly_reports 
       SET status='Submitted', self_submitted_at=NOW(), updated_at=NOW() 
       WHERE id=$1`, [id]
    );

    // Create approval row for reporting manager
    await query(
      `INSERT INTO kpi_yearly_approvals(report_id, approver_role, status)
       VALUES($1,'reporting_manager','Pending')
       ON CONFLICT(report_id, approver_role) DO UPDATE SET status='Pending', acted_at=NULL, remarks=NULL`,
      [id]
    );

    return success(res, null, 'Self-assessment submitted for manager review.');
  } catch (err) { return error(res, err.message); }
};

// ─── Manager Review ───────────────────────────────────────────────────────────

exports.managerReview = async (req, res) => {
  const { id } = req.params;
  const { action, items, manager_remarks } = req.body;
  // action: 'return' | 'forward'
  if (!['return', 'forward'].includes(action)) {
    return error(res, "action must be 'return' or 'forward'.", 400);
  }

  try {
    const reportRes = await query(
      `SELECT r.*, e.employee_type, d.name AS dept_name FROM kpi_yearly_reports r JOIN employees e ON e.emp_id = r.emp_id LEFT JOIN departments d ON d.id = e.dept_id WHERE r.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    if (report.status !== 'Submitted') {
      return error(res, 'Report is not at manager review stage.', 400);
    }
    if (!canActAsManager(req.user, report)) {
      return error(res, 'Only the reporting manager can review this report.', 403);
    }

    // Save manager scores on items
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.id) {
          await query(
            `UPDATE kpi_yearly_items SET manager_score=$1, manager_item_remarks=$2, updated_at=NOW() WHERE id=$3 AND report_id=$4`,
            [item.manager_score ?? null, item.manager_item_remarks || null, item.id, id]
          );
        }
      }
    }

    // Recompute manager overall score
    const updatedItems = await query('SELECT * FROM kpi_yearly_items WHERE report_id=$1', [id]);
    const managerScore = computeWeightedScore(updatedItems.rows, 'manager_score');
    // Final score = average of self and manager score
    const selfScore = parseFloat(report.overall_self_score) || 0;
    const overallScore = parseFloat(((selfScore + managerScore) / 2).toFixed(2));

    // Update approval row
    const approvalStatus = action === 'forward' ? 'Approved' : 'Returned';
    await query(
      `UPDATE kpi_yearly_approvals SET status=$1, approver_id=$2, remarks=$3, acted_at=NOW()
       WHERE report_id=$4 AND approver_role='reporting_manager'`,
      [approvalStatus, req.user.id, manager_remarks || null, id]
    );

    if (action === 'return') {
      await query(
        `UPDATE kpi_yearly_reports SET status='Returned', manager_remarks=$1,
         overall_manager_score=$2, overall_score=$3, manager_reviewed_at=NOW(), updated_at=NOW()
         WHERE id=$4`,
        [manager_remarks || null, managerScore, overallScore, id]
      );
      return success(res, null, 'Report returned to employee for revision.');
    }

    // Forward to next stage based on department
    const chain = getApprovalChain(report.dept_name);
    const nextStage = chain[1]; // index 0 = reporting_manager, 1 = next

    let newStatus;
    if (nextStage === 'cpo') newStatus = 'CPO Review';
    else if (nextStage === 'sales_lead') newStatus = 'Sales Lead Review';
    else newStatus = 'MD Review'; // goes directly to MD

    await query(
      `UPDATE kpi_yearly_reports SET status=$1, manager_remarks=$2,
       overall_manager_score=$3, overall_score=$4, manager_reviewed_at=NOW(), updated_at=NOW()
       WHERE id=$5`,
      [newStatus, manager_remarks || null, managerScore, overallScore, id]
    );

    // Create approval row for next stage
    await query(
      `INSERT INTO kpi_yearly_approvals(report_id, approver_role, status)
       VALUES($1,$2,'Pending')
       ON CONFLICT(report_id, approver_role) DO UPDATE SET status='Pending', acted_at=NULL, remarks=NULL`,
      [id, nextStage]
    );
    // MD row set to Waiting if not direct
    if (nextStage !== 'md') {
      await query(
        `INSERT INTO kpi_yearly_approvals(report_id, approver_role, status)
         VALUES($1,'md','Waiting')
         ON CONFLICT(report_id, approver_role) DO UPDATE SET status='Waiting'`,
        [id]
      );
    }

    return success(res, null, `Report forwarded to ${nextStage.replace('_', ' ')} review.`);
  } catch (err) { return error(res, err.message); }
};

// ─── CPO Action ───────────────────────────────────────────────────────────────

exports.cpoAction = async (req, res) => {
  const { id } = req.params;
  const { action, remarks } = req.body;
  if (!['approve', 'return'].includes(action)) return error(res, "action must be 'approve' or 'return'.", 400);

  try {
    const reportRes = await query(
      `SELECT r.*, e.employee_type FROM kpi_yearly_reports r JOIN employees e ON e.emp_id = r.emp_id WHERE r.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    if (report.status !== 'CPO Review') return error(res, 'Report is not at CPO review stage.', 400);

    const newStatus = action === 'approve' ? 'Approved' : 'Returned';
    await query(
      `UPDATE kpi_yearly_approvals SET status=$1, approver_id=$2, remarks=$3, acted_at=NOW()
       WHERE report_id=$4 AND approver_role='cpo'`,
      [newStatus, req.user.id, remarks || null, id]
    );

    if (action === 'return') {
      await query(
        `UPDATE kpi_yearly_reports SET status='Returned', cpo_remarks=$1, updated_at=NOW() WHERE id=$2`,
        [remarks || null, id]
      );
      return success(res, null, 'Report returned by CPO.');
    }

    // Advance to MD Review
    await query(
      `UPDATE kpi_yearly_reports SET status='MD Review', cpo_remarks=$1, updated_at=NOW() WHERE id=$2`,
      [remarks || null, id]
    );
    await query(
      `INSERT INTO kpi_yearly_approvals(report_id, approver_role, status)
       VALUES($1,'md','Pending')
       ON CONFLICT(report_id, approver_role) DO UPDATE SET status='Pending', acted_at=NULL, remarks=NULL`,
      [id]
    );
    return success(res, null, 'CPO approved. Report moved to MD Review.');
  } catch (err) { return error(res, err.message); }
};

// ─── Sales Lead Action ────────────────────────────────────────────────────────

exports.salesLeadAction = async (req, res) => {
  const { id } = req.params;
  const { action, remarks } = req.body;
  if (!['approve', 'return'].includes(action)) return error(res, "action must be 'approve' or 'return'.", 400);

  try {
    const reportRes = await query(
      `SELECT r.*, e.employee_type FROM kpi_yearly_reports r JOIN employees e ON e.emp_id = r.emp_id WHERE r.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    if (report.status !== 'Sales Lead Review') return error(res, 'Report is not at Sales Lead review stage.', 400);

    const newStatus = action === 'approve' ? 'Approved' : 'Returned';
    await query(
      `UPDATE kpi_yearly_approvals SET status=$1, approver_id=$2, remarks=$3, acted_at=NOW()
       WHERE report_id=$4 AND approver_role='sales_lead'`,
      [newStatus, req.user.id, remarks || null, id]
    );

    if (action === 'return') {
      await query(
        `UPDATE kpi_yearly_reports SET status='Returned', cpo_remarks=$1, updated_at=NOW() WHERE id=$2`,
        [remarks || null, id]
      );
      return success(res, null, 'Report returned by Sales Lead.');
    }

    await query(
      `UPDATE kpi_yearly_reports SET status='MD Review', cpo_remarks=$1, updated_at=NOW() WHERE id=$2`,
      [remarks || null, id]
    );
    await query(
      `INSERT INTO kpi_yearly_approvals(report_id, approver_role, status)
       VALUES($1,'md','Pending')
       ON CONFLICT(report_id, approver_role) DO UPDATE SET status='Pending', acted_at=NULL, remarks=NULL`,
      [id]
    );
    return success(res, null, 'Sales Lead approved. Report moved to MD Review.');
  } catch (err) { return error(res, err.message); }
};

// ─── MD Action ────────────────────────────────────────────────────────────────

exports.mdAction = async (req, res) => {
  const { id } = req.params;
  const { action, remarks } = req.body;
  if (!['approve', 'return'].includes(action)) return error(res, "action must be 'approve' or 'return'.", 400);

  try {
    const reportRes = await query('SELECT * FROM kpi_yearly_reports WHERE id=$1', [id]);
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    if (reportRes.rows[0].status !== 'MD Review') return error(res, 'Report is not at MD review stage.', 400);

    const newStatus = action === 'approve' ? 'Approved' : 'Returned';
    await query(
      `UPDATE kpi_yearly_approvals SET status=$1, approver_id=$2, remarks=$3, acted_at=NOW()
       WHERE report_id=$4 AND approver_role='md'`,
      [newStatus, req.user.id, remarks || null, id]
    );

    if (action === 'return') {
      await query(
        `UPDATE kpi_yearly_reports SET status='Returned', md_remarks=$1, updated_at=NOW() WHERE id=$2`,
        [remarks || null, id]
      );
      return success(res, null, 'Report returned by MD.');
    }

    await query(
      `UPDATE kpi_yearly_reports SET status='Approved', md_remarks=$1, updated_at=NOW() WHERE id=$2`,
      [remarks || null, id]
    );
    return success(res, null, 'MD approved the report.');
  } catch (err) { return error(res, err.message); }
};

// ─── Publish ──────────────────────────────────────────────────────────────────

exports.publishReport = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query('SELECT status FROM kpi_yearly_reports WHERE id=$1', [id]);
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    if (reportRes.rows[0].status !== 'Approved') {
      return error(res, 'Only Approved reports can be published.', 400);
    }
    await query(
      `UPDATE kpi_yearly_reports SET status='Published', published_at=NOW(), updated_at=NOW() WHERE id=$1`, [id]
    );
    return success(res, null, 'KPI report published. KRA discussion can now begin.');
  } catch (err) { return error(res, err.message); }
};

// ─── KRA Discussion ───────────────────────────────────────────────────────────

exports.recordKRADiscussion = async (req, res) => {
  const { id } = req.params;
  const {
    increment_percentage, increment_amount, new_grade,
    new_designation, kra_score, discussion_notes
  } = req.body;

  try {
    const reportRes = await query(
      `SELECT r.*,
        e.first_name||' '||e.last_name AS emp_name,
        c.name AS cycle_name,
        c.year
       FROM kpi_yearly_reports r 
       JOIN kpi_yearly_cycles c ON c.id = r.cycle_id
       JOIN employees e ON e.emp_id = r.emp_id
       WHERE r.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    if (report.status !== 'Published') {
      return error(res, 'KRA discussion can only be recorded for Published reports.', 400);
    }

    const result = await query(
      `INSERT INTO kra_discussions(
         report_id, year, emp_id,
         discussed_by_cpo_id, discussed_by_md_id,
         increment_percentage, increment_amount, new_grade,
         new_designation, kra_score, discussion_notes, decided_at
       )
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT(report_id) DO UPDATE SET
         discussed_by_cpo_id=$4, discussed_by_md_id=$5,
         increment_percentage=$6, increment_amount=$7, new_grade=$8,
         new_designation=$9, kra_score=$10, discussion_notes=$11,
         decided_at=NOW(), updated_at=NOW()
       RETURNING *`,
      [
        id, report.year, report.emp_id,
        req.user.id,                        // who is recording (CPO or MD)
        req.body.md_user_id || req.user.id, // second discussant
        increment_percentage || 0,
        increment_amount || 0,
        new_grade || null,
        new_designation || null,
        kra_score || null,
        discussion_notes || null,
      ]
    );

    return success(res, result.rows[0], 'KRA discussion recorded.');
  } catch (err) { return error(res, err.message); }
};

// ─── AI Insights ──────────────────────────────────────────────────────────────

exports.generateAIInsights = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query(
      `SELECT r.*,
              e.first_name||' '||e.last_name AS emp_name,
              e.employee_type,
              d.name AS dept_name,
              c.name AS cycle_name, c.year
       FROM kpi_yearly_reports r
       JOIN employees e ON e.emp_id = r.emp_id
       LEFT JOIN departments d ON d.id = e.dept_id
       JOIN kpi_yearly_cycles c ON c.id = r.cycle_id
       WHERE r.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    const itemsRes = await query(
      `SELECT item_name, weightage, target, self_score, manager_score, self_remarks, manager_item_remarks
       FROM kpi_yearly_items WHERE report_id=$1 ORDER BY sort_order`, [id]
    );
    const items = itemsRes.rows;

    let insights = null;

    if (process.env.GROQ_API_KEY) {
      try {
        const itemsText = items.map(i =>
          `- ${i.item_name} (Weight: ${i.weightage}%)\n  Target: ${i.target || 'N/A'}\n  Self Score: ${i.self_score ?? 'N/A'}/100\n  Manager Score: ${i.manager_score ?? 'N/A'}/100\n  Self Remarks: "${i.self_remarks || 'None'}"\n  Manager Remarks: "${i.manager_item_remarks || 'None'}"`
        ).join('\n');

        const prompt = `
Employee: ${report.emp_name}
Department: ${report.dept_name}
Employee Type: ${report.employee_type}
KPI Year: ${report.cycle_name}
Overall Self Score: ${report.overall_self_score}/100
Overall Manager Score: ${report.overall_manager_score}/100
Final Overall Score: ${report.overall_score}/100
Employee Remarks: "${report.employee_remarks || 'None'}"
Manager Remarks: "${report.manager_remarks || 'None'}"

KPI Items:
${itemsText}
`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `You are an AI HR performance analyst. Analyze yearly KPI data and return ONLY this JSON:
{
  "summary": "Professional 2-3 sentence annual performance summary.",
  "overall_rating": "Outstanding | Exceeds Expectations | Meets Expectations | Needs Improvement | Unsatisfactory",
  "kpi_highlights": ["top KPI 1", "top KPI 2"],
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "areas_for_improvement": ["area 1", "area 2"],
  "recommendation": "Specific recommendation for next year's goals and development.",
  "score_analysis": "Analysis of self vs manager score alignment.",
  "increment_suggestion": "Based on performance, suggest increment range e.g. 8-12%."
}`,
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content;
          if (content) {
            content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            insights = JSON.parse(content);
          }
        }
      } catch (apiErr) {
        console.error('Groq API error:', apiErr.message);
      }
    }

    if (!insights) {
      const score = parseFloat(report.overall_score);
      const rating = score >= 90 ? 'Outstanding' : score >= 75 ? 'Exceeds Expectations' : score >= 60 ? 'Meets Expectations' : 'Needs Improvement';
      insights = {
        summary: `[Simulated] ${report.emp_name} achieved an overall annual KPI score of ${score.toFixed(1)}/100 for ${report.cycle_name}, reflecting ${rating.toLowerCase()} performance.`,
        overall_rating: rating,
        kpi_highlights: items.slice(0, 2).map(i => i.item_name),
        key_strengths: ['Goal alignment', 'Consistent delivery'],
        areas_for_improvement: ['Cross-functional collaboration', 'Documentation'],
        recommendation: 'Set more measurable targets for next year and focus on identified improvement areas.',
        score_analysis: `Self score: ${report.overall_self_score}, Manager score: ${report.overall_manager_score}. Final: ${score.toFixed(1)}.`,
        increment_suggestion: score >= 90 ? '12-15%' : score >= 75 ? '8-12%' : score >= 60 ? '5-8%' : '0-5%',
      };
    }

    await query(`UPDATE kpi_yearly_reports SET ai_insights=$1, updated_at=NOW() WHERE id=$2`, [JSON.stringify(insights), id]);
    return success(res, insights, 'AI insights generated');
  } catch (err) { return error(res, err.message); }
};
