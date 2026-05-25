const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.getAttendance = async (req, res) => {
  const { month, year, emp_id } = req.query;
  try {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    const eId = req.user.role === 'employee' ? req.user.emp_id : (emp_id || req.user.emp_id);

    if (!eId) {
      return success(res, [], 'No employee specified');
    }

    const result = await query(
      `SELECT * FROM attendance_records 
       WHERE emp_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3
       ORDER BY date DESC`,
      [eId, m, y]
    );
    return success(res, result.rows, 'Attendance fetched successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.syncBiometrics = async (req, res) => {
  // Simulates syncing data from an external biometric system
  try {
    const emp_id = req.user.role === 'employee' ? req.user.emp_id : (req.body.emp_id || req.user.emp_id);
    if (!emp_id) return error(res, 'Employee ID is required', 400);

    const today = new Date().toISOString().split('T')[0];
    const existing = await query(`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = $2`, [emp_id, today]);

    if (existing.rows.length > 0) {
      if (!existing.rows[0].punch_out) {
        const result = await query(`UPDATE attendance_records SET punch_out = CURRENT_TIME, updated_at = NOW() WHERE id = $1 RETURNING *`, [existing.rows[0].id]);
        return success(res, result.rows[0], 'Biometric sync: Punched out successfully');
      } else {
        return success(res, existing.rows[0], 'Biometric sync: Already punched out today');
      }
    } else {
      const result = await query(`INSERT INTO attendance_records (emp_id, date, punch_in, status, biometric_sync) VALUES ($1, $2, CURRENT_TIME, 'Present', true) RETURNING *`, [emp_id, today]);
      return success(res, result.rows[0], 'Biometric sync: Punched in successfully');
    }
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.punch = async (req, res) => {
  const emp_id = req.user.emp_id;
  const nowLocal = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)); // crude IST for simplicity if timezone needed, but let's just rely on DB server time via CURRENT_TIME
  const today = new Date().toISOString().split('T')[0];
  try {
    // Get shift settings
    const settings = await query(`SELECT * FROM attendance_settings LIMIT 1`);
    const shift = settings.rows[0] || { shift_start: '09:00:00', grace_period_mins: 30 };

    const existing = await query(`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = CURRENT_DATE`, [emp_id]);

    if (existing.rows.length > 0) {
      if (!existing.rows[0].punch_out) {
        const result = await query(
          `UPDATE attendance_records SET punch_out = CURRENT_TIME, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [existing.rows[0].id]
        );
        return success(res, result.rows[0], 'Punched out successfully');
      } else {
        return error(res, 'Already punched out today', 400);
      }
    } else {
      // Check if late (Using postgres CURRENT_TIME logic instead of JS)
      const result = await query(
        `INSERT INTO attendance_records (emp_id, date, punch_in, status, biometric_sync) 
         VALUES (
           $1, 
           CURRENT_DATE, 
           CURRENT_TIME, 
           CASE 
             WHEN CURRENT_TIME > ($2::TIME + ($3 || ' minutes')::INTERVAL) THEN 'Late'
             ELSE 'Present'
           END, 
           false
         ) RETURNING *`,
        [emp_id, shift.shift_start, shift.grace_period_mins]
      );
      return success(res, result.rows[0], 'Punched in successfully');
    }
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.applyRegularization = async (req, res) => {
  const { date, reason, requested_in, requested_out } = req.body;
  const emp_id = req.user.emp_id;
  try {
    const result = await query(
      `INSERT INTO regularization_requests (emp_id, date, reason, requested_in, requested_out) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [emp_id, date, reason, requested_in || null, requested_out || null]
    );
    return success(res, result.rows[0], 'Regularization requested');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.getRegularization = async (req, res) => {
  try {
    let result;
    if (req.user.role === 'employee') {
      result = await query(`SELECT * FROM regularization_requests WHERE emp_id = $1 ORDER BY created_at DESC`, [req.user.emp_id]);
    } else {
      result = await query(`
        SELECT r.*, e.first_name, e.last_name 
        FROM regularization_requests r 
        JOIN employees e ON r.emp_id = e.emp_id 
        ORDER BY created_at DESC`);
    }
    return success(res, result.rows, 'Regularization requests fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.reviewRegularization = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const reqData = await query(`SELECT * FROM regularization_requests WHERE id = $1`, [id]);
    if (reqData.rows.length === 0) return error(res, 'Request not found', 404);

    const r = reqData.rows[0];
    await query(`UPDATE regularization_requests SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);

    if (status === 'Approved') {
      const existing = await query(`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = $2`, [r.emp_id, r.date]);
      if (existing.rows.length > 0) {
        await query(
          `UPDATE attendance_records SET punch_in = COALESCE($1, punch_in), punch_out = COALESCE($2, punch_out), status = 'Present', updated_at = NOW() WHERE id = $3`,
          [r.requested_in, r.requested_out, existing.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO attendance_records (emp_id, date, punch_in, punch_out, status, biometric_sync) VALUES ($1, $2, $3, $4, 'Present', false)`,
          [r.emp_id, r.date, r.requested_in, r.requested_out]
        );
      }
    }
    return success(res, null, `Request ${status}`);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.getSettings = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM attendance_settings LIMIT 1`);
    return success(res, result.rows[0], 'Settings fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.updateSettings = async (req, res) => {
  const { shift_start, shift_end, grace_period_mins } = req.body;
  try {1
    const result = await query(
      `UPDATE attendance_settings SET shift_start = $1, shift_end = $2, grace_period_mins = $3, updated_at = NOW() WHERE id = (SELECT id FROM attendance_settings LIMIT 1) RETURNING *`,
      [shift_start, shift_end, grace_period_mins]
    );
    return success(res, result.rows[0], 'Settings updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};  