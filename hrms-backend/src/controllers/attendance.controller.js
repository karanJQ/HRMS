const { query } = require('../config/database');
const { success, error } = require('../utils/response');

const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const getDaysInMonth = (y, m) => {
  if (m === 2 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) return 29;
  return DAYS_IN_MONTH[m];
};

exports.getAttendance = async (req, res) => {
  const { month, year, emp_id } = req.query;
  try {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    const eId = req.user.role === 'employee' ? req.user.emp_id : (emp_id || req.user.emp_id);
    if (!eId) return success(res, [], 'No employee specified');

    const result = await query(
      `SELECT a.*, COALESCE(w.status, '') as wfh_status,
        CASE WHEN h.id IS NOT NULL THEN true ELSE false END as is_holiday,
        h.name as holiday_name
       FROM attendance_records a
       LEFT JOIN wfh_requests w ON w.emp_id = a.emp_id AND w.date = a.date
       LEFT JOIN holidays h ON h.date = a.date
       WHERE a.emp_id = $1 AND EXTRACT(MONTH FROM a.date) = $2 AND EXTRACT(YEAR FROM a.date) = $3
       ORDER BY a.date DESC`,
      [eId, m, y]
    );
    return success(res, result.rows, 'Attendance fetched successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.getCalendar = async (req, res) => {
  const { month, year, emp_id } = req.query;
  try {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const eId = req.user.role === 'employee' ? req.user.emp_id : (emp_id || req.user.emp_id);
    if (!eId) return success(res, [], 'No employee specified');

    const daysInMonth = getDaysInMonth(y, m);

    const recordsRes = await query(
      `SELECT to_char(d.date, 'YYYY-MM-DD') as date,
              a.status, a.punch_in, a.punch_out, a.biometric_sync, a.is_regularized, a.working_hours,
              l.leave_type, l.half_day_type, l.status as leave_status,
              w.status as wfh_status,
              CASE WHEN h.id IS NOT NULL THEN true ELSE false END as is_holiday,
              h.name as holiday_name
       FROM generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) AS d(date)
       LEFT JOIN attendance_records a ON a.emp_id = $3 AND a.date = d.date
       LEFT JOIN leave_applications l ON l.emp_id = $3 AND d.date BETWEEN l.from_date AND l.to_date AND l.status = 'Approved'
       LEFT JOIN wfh_requests w ON w.emp_id = $3 AND w.date = d.date AND w.status = 'Approved'
       LEFT JOIN holidays h ON h.date = d.date
       ORDER BY d.date`,
      [`${y}-${String(m).padStart(2,'0')}-01`, `${y}-${String(m).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`, eId]
    );

    const result = recordsRes.rows.map(row => {
      const dateStr = row.date;
      const d = new Date(dateStr + 'T00:00:00');
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const isFuture = dateStr > todayStr;

      let computedStatus;
      if (row.punch_in) {
        if (row.working_hours !== null && parseFloat(row.working_hours) < 9) {
          computedStatus = 'Half Day';
        } else {
          computedStatus = 'Present';
        }
      } else if (row.is_holiday) {
        computedStatus = 'Holiday';
      } else if (isFuture) {
        if (row.leave_status === 'Approved') {
          computedStatus = ['FIRST_HALF','SECOND_HALF'].includes(row.half_day_type) ? 'Half Day'
                       : row.leave_type === 'WFH' ? 'WFH' : 'Leave';
        } else if (row.wfh_status === 'Approved') {
          computedStatus = 'WFH';
        } else if (row.status) {
          computedStatus = row.status;
        } else {
          computedStatus = 'Upcoming';
        }
      } else if (row.leave_status === 'Approved') {
        computedStatus = ['FIRST_HALF','SECOND_HALF'].includes(row.half_day_type) ? 'Half Day'
                     : row.leave_type === 'WFH' ? 'WFH' : 'Leave';
      } else if (row.status) {
        computedStatus = row.status;
      } else if (row.wfh_status === 'Approved') {
        computedStatus = 'WFH';
      } else if (isWeekend) {
        computedStatus = 'Weekend';
      } else if (dateStr < todayStr) {
        computedStatus = 'Absent';
      } else {
        computedStatus = 'No Record';
      }

      const wh = row.working_hours;
      if ((!wh || parseFloat(wh) === 0) && row.punch_in && row.punch_out) {
        const [ih, im] = row.punch_in.split(':');
        const [oh, om] = row.punch_out.split(':');
        const diff = (parseInt(oh)*60+parseInt(om)) - (parseInt(ih)*60+parseInt(im));
        row.working_hours = Math.max(0, diff / 60).toFixed(1);
      }

      return {
        date: dateStr,
        status: computedStatus,
        punch_in: row.punch_in,
        punch_out: row.punch_out,
        biometric_sync: row.biometric_sync,
        is_regularized: row.is_regularized,
        working_hours: row.working_hours,
        is_holiday: row.is_holiday,
        holiday_name: row.holiday_name,
        leave_type: row.leave_type,
        half_day_type: row.half_day_type,
        wfh_status: row.wfh_status,
        dayOfWeek: d.getDay()
      };
    });

    return success(res, { calendar: result, month: m, year: y, daysInMonth });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.getMonthlyStats = async (req, res) => {
  const { month, year, emp_id } = req.query;
  try {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const eId = req.user.role === 'employee' ? req.user.emp_id : (emp_id || req.user.emp_id);
    if (!eId) return success(res, {}, 'No employee specified');

    const daysInMonth = getDaysInMonth(y, m);

    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE a.status = 'Present') as present,
        COUNT(*) FILTER (WHERE a.status = 'Absent') as absent,
        COUNT(*) FILTER (WHERE a.status = 'Late') as late,
        COUNT(*) FILTER (WHERE a.status = 'Half Day' OR (l.half_day_type IS NOT NULL AND l.status = 'Approved')) as half_days,
        COUNT(*) FILTER (WHERE a.status = 'WFH' OR w.status = 'Approved') as wfh,
        COUNT(*) FILTER (WHERE l.status = 'Approved' AND l.half_day_type IS NULL AND l.leave_type NOT IN ('WFH','Outdoor Duty')) as leave_days,
        SUM(a.working_hours) as total_hours,
        SUM(a.ot_hours) as total_ot
       FROM generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) AS d(date)
       LEFT JOIN attendance_records a ON a.emp_id = $3 AND a.date = d.date
       LEFT JOIN leave_applications l ON l.emp_id = $3 AND d.date BETWEEN l.from_date AND l.to_date AND l.status = 'Approved'
       LEFT JOIN wfh_requests w ON w.emp_id = $3 AND w.date = d.date AND w.status = 'Approved'`,
      [`${y}-${String(m).padStart(2,'0')}-01`, `${y}-${String(m).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`, eId]
    );
    return success(res, result.rows[0]);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.syncBiometrics = async (req, res) => {
  try {
    const emp_id = req.user.role === 'employee' ? req.user.emp_id : (req.body.emp_id || req.user.emp_id);
    if (!emp_id) return error(res, 'Employee ID is required', 400);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const existing = await query(`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = $2`, [emp_id, todayStr]);

    if (existing.rows.length > 0) {
      if (!existing.rows[0].punch_out) {
        if (!existing.rows[0].punch_in) {
          const result = await query(
            `UPDATE attendance_records SET punch_in = CURRENT_TIME, status = 'Present', biometric_sync = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
            [existing.rows[0].id]
          );
          return success(res, result.rows[0], 'Biometric sync: Punched in successfully');
        }
        const punchOut = await query(`SELECT CURRENT_TIME as t`);
        const outTime = punchOut.rows[0].t;
        const inTime = existing.rows[0].punch_in;
        const hrs = await query(
          `SELECT EXTRACT(EPOCH FROM ($1::TIME - $2::TIME)) / 3600.0 as hours`,
          [outTime, inTime]
        );
        const workingHours = Math.max(0, parseFloat(hrs.rows[0].hours));
        const outStatus = workingHours < 9 ? 'Half Day' : 'Present';

        const result = await query(
          `UPDATE attendance_records SET punch_out = $1, working_hours = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
          [outTime, workingHours.toFixed(1), outStatus, existing.rows[0].id]
        );
        return success(res, result.rows[0], 'Biometric sync: Punched out successfully');
      }
      return success(res, existing.rows[0], 'Biometric sync: Already punched out today');
    }

    const result = await query(
      `INSERT INTO attendance_records (emp_id, date, punch_in, status, biometric_sync)
       VALUES ($1, $2, CURRENT_TIME, 'Present', true) RETURNING *`,
      [emp_id, todayStr]
    );
    return success(res, result.rows[0], 'Biometric sync: Punched in successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.punch = async (req, res) => {
  const emp_id = req.user.emp_id;
  try {
    const settings = await query(`SELECT * FROM attendance_settings LIMIT 1`);
    const shift = settings.rows[0] || { shift_start: '09:00:00', grace_period_mins: 30 };

    const existing = await query(`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = CURRENT_DATE`, [emp_id]);

    if (existing.rows.length > 0) {
      if (!existing.rows[0].punch_out) {
        if (!existing.rows[0].punch_in) {
          const result = await query(
            `UPDATE attendance_records SET punch_in = CURRENT_TIME, status = 'Present', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [existing.rows[0].id]
          );
          return success(res, result.rows[0], 'Punched in successfully');
        }
        const punchOut = await query(`SELECT CURRENT_TIME as t`);
        const outTime = punchOut.rows[0].t;
        const inTime = existing.rows[0].punch_in;
        const hrs = await query(
          `SELECT EXTRACT(EPOCH FROM ($1::TIME - $2::TIME)) / 3600.0 as hours`,
          [outTime, inTime]
        );
        const workingHours = Math.max(0, parseFloat(hrs.rows[0].hours));
        const outStatus = workingHours < 9 ? 'Half Day' : 'Present';

        const result = await query(
          `UPDATE attendance_records SET punch_out = $1, working_hours = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
          [outTime, workingHours.toFixed(1), outStatus, existing.rows[0].id]
        );
        return success(res, result.rows[0], 'Punched out successfully');
      }
      return error(res, 'Already punched out today', 400);
    }

    const result = await query(
      `INSERT INTO attendance_records (emp_id, date, punch_in, status, biometric_sync)
       VALUES ($1, CURRENT_DATE, CURRENT_TIME,
         CASE WHEN CURRENT_TIME > ($2::TIME + ($3 || ' minutes')::INTERVAL) THEN 'Late' ELSE 'Present' END,
         false) RETURNING *`,
      [emp_id, shift.shift_start, shift.grace_period_mins]
    );
    return success(res, result.rows[0], 'Punched in successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.applyRegularization = async (req, res) => {
  const { date, reason, requested_in, requested_out, half_day_type, regularization_type } = req.body;
  const emp_id = req.user.role === 'employee' ? req.user.emp_id : (req.body.emp_id || req.user.emp_id);
  try {
    const existing = await query(`SELECT * FROM regularization_requests WHERE emp_id = $1 AND date = $2 AND status = 'Pending'`, [emp_id, date]);
    if (existing.rows.length > 0) return error(res, 'A pending regularization request already exists for this date', 400);

    const result = await query(
      `INSERT INTO regularization_requests (emp_id, date, reason, requested_in, requested_out, half_day_type, regularization_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [emp_id, date, reason, requested_in || null, requested_out || null, half_day_type || null, regularization_type || 'full_day']
    );
    return success(res, result.rows[0], 'Regularization request submitted');
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
        SELECT r.*, e.first_name, e.last_name, d.name as dept_name
        FROM regularization_requests r
        JOIN employees e ON r.emp_id = e.emp_id
        JOIN departments d ON d.id = e.dept_id
        ORDER BY r.created_at DESC`);
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
      const attStatus = r.half_day_type ? 'Half Day' : 'Present';
      const existing = await query(`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = $2`, [r.emp_id, r.date]);
      
      const finalIn = r.requested_in || existing?.rows[0]?.punch_in;
      const finalOut = r.requested_out || existing?.rows[0]?.punch_out;
      
      let working_hours = null;
      if (finalIn && finalOut) {
        const [ih, im] = finalIn.split(':');
        const [oh, om] = finalOut.split(':');
        const diff = (parseInt(oh)*60+parseInt(om)) - (parseInt(ih)*60+parseInt(im));
        working_hours = Math.max(0, diff / 60).toFixed(1);
      }

      if (existing.rows.length > 0) {
        await query(
          `UPDATE attendance_records SET punch_in = COALESCE($1, punch_in), punch_out = COALESCE($2, punch_out), working_hours = $3, status = $4, is_regularized = true, updated_at = NOW() WHERE id = $5`,
          [r.requested_in, r.requested_out, working_hours, attStatus, existing.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO attendance_records (emp_id, date, punch_in, punch_out, working_hours, status, biometric_sync, is_regularized) VALUES ($1, $2, $3, $4, $5, $6, false, true)`,
          [r.emp_id, r.date, r.requested_in, r.requested_out, working_hours, attStatus]
        );
      }
    }
    return success(res, null, `Request ${status}`);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.applyWFH = async (req, res) => {
  const { date, reason } = req.body;
  const emp_id = req.user.emp_id;
  try {
    const existing = await query(`SELECT * FROM wfh_requests WHERE emp_id = $1 AND date = $2`, [emp_id, date]);
    if (existing.rows.length > 0) return error(res, 'A WFH request already exists for this date', 400);

    const result = await query(
      `INSERT INTO wfh_requests (emp_id, date, reason) VALUES ($1, $2, $3) RETURNING *`,
      [emp_id, date, reason]
    );
    return success(res, result.rows[0], 'Work from home request submitted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.getWFH = async (req, res) => {
  try {
    let result;
    if (req.user.role === 'employee') {
      result = await query(`SELECT * FROM wfh_requests WHERE emp_id = $1 ORDER BY created_at DESC`, [req.user.emp_id]);
    } else {
      result = await query(`
        SELECT w.*, e.first_name, e.last_name, d.name as dept_name
        FROM wfh_requests w
        JOIN employees e ON w.emp_id = e.emp_id
        JOIN departments d ON d.id = e.dept_id
        ORDER BY w.created_at DESC`);
    }
    return success(res, result.rows, 'WFH requests fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.reviewWFH = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const wfhData = await query(`SELECT * FROM wfh_requests WHERE id = $1`, [id]);
    if (wfhData.rows.length === 0) return error(res, 'Request not found', 404);

    await query(`UPDATE wfh_requests SET status = $1, reviewed_by = $2, reviewed_date = NOW(), updated_at = NOW() WHERE id = $3`,
      [status, req.user.id, id]);

    if (status === 'Approved') {
      const existing = await query(`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = $2`, [wfhData.rows[0].emp_id, wfhData.rows[0].date]);
      if (existing.rows.length > 0) {
        await query(`UPDATE attendance_records SET status = 'WFH', updated_at = NOW() WHERE id = $1`, [existing.rows[0].id]);
      } else {
        await query(
          `INSERT INTO attendance_records (emp_id, date, status, biometric_sync) VALUES ($1, $2, 'WFH', false)`,
          [wfhData.rows[0].emp_id, wfhData.rows[0].date]
        );
      }
    }
    return success(res, null, `WFH request ${status}`);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.getHolidays = async (req, res) => {
  const { year, month } = req.query;
  try {
    let result;
    if (year && month) {
      result = await query(
        `SELECT id, to_char(date, 'YYYY-MM-DD') as date, name, type FROM holidays WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2 ORDER BY date`,
        [year, month]
      );
    } else if (year) {
      result = await query(`SELECT id, to_char(date, 'YYYY-MM-DD') as date, name, type FROM holidays WHERE EXTRACT(YEAR FROM date) = $1 ORDER BY date`, [year]);
    } else {
      result = await query(`SELECT id, to_char(date, 'YYYY-MM-DD') as date, name, type FROM holidays WHERE date >= NOW() - INTERVAL '1 month' ORDER BY date`);
    }
    return success(res, result.rows, 'Holidays fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.addHoliday = async (req, res) => {
  const { date, name, type } = req.body;
  if (!date || !name) return error(res, 'Date and name are required', 400);
  try {
    const result = await query(
      `INSERT INTO holidays (date, name, type) VALUES ($1, $2, $3) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type RETURNING *`,
      [date, name, type || 'Festival']
    );
    return success(res, result.rows[0], 'Holiday added successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.deleteHoliday = async (req, res) => {
  const { id } = req.params;
  try {
    await query(`DELETE FROM holidays WHERE id = $1`, [id]);
    return success(res, null, 'Holiday deleted');
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
  const { shift_start, shift_end, grace_period_mins, ot_rate_weekday, ot_rate_weekend, ot_rate_holiday, working_days, half_day_cutoff, auto_absent_minutes, enable_overtime } = req.body;
  try {
    const result = await query(
      `UPDATE attendance_settings SET
        shift_start = COALESCE($1, shift_start),
        shift_end = COALESCE($2, shift_end),
        grace_period_mins = COALESCE($3, grace_period_mins),
        ot_rate_weekday = COALESCE($4, ot_rate_weekday),
        ot_rate_weekend = COALESCE($5, ot_rate_weekend),
        ot_rate_holiday = COALESCE($6, ot_rate_holiday),
        working_days = COALESCE($7, working_days),
        half_day_cutoff = COALESCE($8, half_day_cutoff),
        auto_absent_minutes = COALESCE($9, auto_absent_minutes),
        enable_overtime = COALESCE($10, enable_overtime),
        updated_at = NOW()
      WHERE id = (SELECT id FROM attendance_settings LIMIT 1)
      RETURNING *`,
      [shift_start, shift_end, grace_period_mins, ot_rate_weekday, ot_rate_weekend, ot_rate_holiday, working_days, half_day_cutoff, auto_absent_minutes, enable_overtime]
    );
    return success(res, result.rows[0], 'Settings updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.getTeamCalendar = async (req, res) => {
  const { month, year, dept_id } = req.query;
  try {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    let condition = '';
    const params = [m, y];
    if (req.user.role === 'dept_head' && req.user.dept_id) {
      condition = 'AND e.dept_id = $3';
      params.push(req.user.dept_id);
    } else if (dept_id) {
      condition = 'AND e.dept_id = $3';
      params.push(dept_id);
    }

    const result = await query(
      `SELECT e.emp_id, e.first_name, e.last_name, d.name as dept_name,
        COUNT(*) FILTER (WHERE a.status = 'Present') as present,
        COUNT(*) FILTER (WHERE a.status = 'Absent') as absent,
        COUNT(*) FILTER (WHERE a.status = 'Late') as late,
        COUNT(*) FILTER (WHERE a.status = 'Half Day') as half_days,
        COUNT(*) FILTER (WHERE a.status = 'WFH') as wfh_days
       FROM employees e
       JOIN departments d ON d.id = e.dept_id
       LEFT JOIN attendance_records a ON a.emp_id = e.emp_id
        AND EXTRACT(MONTH FROM a.date) = $1
        AND EXTRACT(YEAR FROM a.date) = $2
       WHERE e.status = 'Active' ${condition}
       GROUP BY e.emp_id, e.first_name, e.last_name, d.name
       ORDER BY e.first_name`,
      params
    );
    return success(res, result.rows, 'Team calendar fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
