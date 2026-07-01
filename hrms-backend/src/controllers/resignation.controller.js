const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  try {
    let result;
    if (req.user.role === 'employee') {
      result = await query(`
        SELECT r.*, e.first_name, e.last_name, d.name as dept_name 
        FROM resignations r
        JOIN employees e ON e.emp_id = r.emp_id
        LEFT JOIN departments d ON d.id = e.dept_id
        WHERE r.emp_id = $1 
        ORDER BY r.created_at DESC
      `, [req.user.emp_id]);
    } else {
      result = await query(`
        SELECT r.*, e.first_name, e.last_name, d.name as dept_name 
        FROM resignations r
        JOIN employees e ON e.emp_id = r.emp_id
        LEFT JOIN departments d ON d.id = e.dept_id
        ORDER BY r.created_at DESC
      `);
    }
    return success(res, result.rows, 'Resignations fetched successfully');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.create = async (req, res) => {
  const { reason, desired_last_date } = req.body;
  if (!reason || !desired_last_date) {
    return error(res, 'Reason and desired last date are required', 400);
  }
  
  try {
    // Check if already applied
    const existing = await query(`SELECT id FROM resignations WHERE emp_id = $1 AND status IN ('Pending', 'Accepted')`, [req.user.emp_id]);
    if (existing.rows.length > 0) {
      return error(res, 'You already have an active resignation request.', 400);
    }

    const result = await query(
      `INSERT INTO resignations(emp_id, reason, desired_last_date, notice_period_days, created_by) 
       VALUES($1, $2, $3, 60, $4) RETURNING *`,
      [req.user.emp_id, reason, desired_last_date, req.user.id]
    );

    // Notify HR
    try {
      const empInfo = await query('SELECT first_name, last_name FROM employees WHERE emp_id = $1', [req.user.emp_id]);
      const empName = empInfo.rows.length > 0 ? `${empInfo.rows[0].first_name} ${empInfo.rows[0].last_name}` : 'An employee';
      
      const hrUsers = await query(`SELECT id FROM users WHERE role IN ('super_admin', 'hr_manager', 'hr_staff')`);
      for (const hr of hrUsers.rows) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, is_read) VALUES ($1, $2, $3, $4, false)`,
          [hr.id, 'Resignation', 'New Resignation Submitted', `${empName} has submitted a resignation request.`]
        );
      }
    } catch (notifErr) {
      console.error('Failed to send resignation notification:', notifErr);
    }

    return success(res, result.rows[0], 'Resignation submitted successfully', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { status, actual_last_date, hr_remarks, noc_cleared, notice_period_days } = req.body;
  
  try {
    const r = await query('SELECT emp_id FROM resignations WHERE id = $1', [id]);
    if (r.rows.length === 0) return error(res, 'Resignation not found', 404);
    
    const result = await query(
      `UPDATE resignations 
       SET status = COALESCE($1, status),
           actual_last_date = COALESCE(NULLIF($2,'')::date, actual_last_date),
           hr_remarks = COALESCE($3, hr_remarks),
           noc_cleared = COALESCE($4, noc_cleared),
           notice_period_days = COALESCE($5, notice_period_days),
           updated_by = $6,
           updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [status, actual_last_date, hr_remarks, noc_cleared, notice_period_days, req.user.id, id]
    );

    // If accepted and actual_last_date passed, you could theoretically update employee status to 'Resigned', 
    // but typically a nightly cron job does that. For now, if accepted, we just update the resignation record.

    return success(res, result.rows[0], 'Resignation updated successfully');
  } catch (err) {
    return error(res, err.message);
  }
};

// Compute leave taken during notice period
exports.getNoticeLeaves = async (req, res) => {
  const { id } = req.params;
  try {
    const resigRes = await query('SELECT emp_id, submission_date, COALESCE(actual_last_date, desired_last_date) as last_date FROM resignations WHERE id = $1', [id]);
    if (resigRes.rows.length === 0) return error(res, 'Resignation not found', 404);
    
    const r = resigRes.rows[0];
    
    if (req.user.role === 'employee' && req.user.emp_id !== r.emp_id) {
      return error(res, 'Access denied', 403);
    }
    
    const leaveRes = await query(`
      SELECT SUM(days) as total_leaves
      FROM leave_applications
      WHERE emp_id = $1 
        AND status = 'Approved'
        AND from_date >= $2
        AND to_date <= $3
    `, [r.emp_id, r.submission_date, r.last_date]);

    return success(res, { leaves_taken: leaveRes.rows[0].total_leaves || 0 });
  } catch (err) {
    return error(res, err.message);
  }
};
