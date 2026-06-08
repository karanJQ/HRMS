const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
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
    const startDate = `${y}-${String(m).padStart(2,'0')}-01`;
    const endDate = `${y}-${String(m).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;

    const settingsRes = await query(`SELECT shift_start, shift_end FROM attendance_settings LIMIT 1`);
    let expectedHours = 9;
    if (settingsRes.rows.length > 0 && settingsRes.rows[0].shift_start && settingsRes.rows[0].shift_end) {
      const [sh, sm] = settingsRes.rows[0].shift_start.split(':');
      const [eh, em] = settingsRes.rows[0].shift_end.split(':');
      expectedHours = (parseInt(eh)*60 + parseInt(em) - (parseInt(sh)*60 + parseInt(sm))) / 60.0;
    }

    if (eId === 'all') {
      const recordsRes = await query(
        `SELECT to_char(d.date, 'YYYY-MM-DD') as date,
                e.emp_id, e.first_name, e.last_name,
                a.status, a.punch_in, a.punch_out, a.working_hours,
                l.leave_type, l.half_day_type, l.status as leave_status,
                w.status as wfh_status,
                CASE WHEN h.id IS NOT NULL THEN true ELSE false END as is_holiday,
                h.name as holiday_name
         FROM generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) AS d(date)
         CROSS JOIN employees e
         LEFT JOIN attendance_records a ON a.emp_id = e.emp_id AND a.date = d.date
         LEFT JOIN leave_applications l ON l.emp_id = e.emp_id AND d.date BETWEEN l.from_date AND l.to_date AND l.status = 'Approved'
         LEFT JOIN wfh_requests w ON w.emp_id = e.emp_id AND w.date = d.date AND w.status = 'Approved'
         LEFT JOIN holidays h ON h.date = d.date
         WHERE e.status = 'Active'
         ORDER BY d.date, e.emp_id`,
        [startDate, endDate]
      );

      const aggByDate = {};
      recordsRes.rows.forEach(row => {
        const dateStr = row.date;
        if (!aggByDate[dateStr]) {
          aggByDate[dateStr] = {
             date: dateStr, status: 'Aggregate',
             dayOfWeek: new Date(dateStr + 'T00:00:00').getDay(),
             present: [], absent: [], leave: [], wfh: [], holiday: [], miss_punch: [], half_day: [], no_record: []
          };
        }
        
        const d = new Date(dateStr + 'T00:00:00');
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const todayStr = new Date().toISOString().split('T')[0];
        const isFuture = dateStr > todayStr;
        
        let empStatus;
        if (row.punch_in) {
          if (!row.punch_out && dateStr < todayStr) empStatus = 'Miss Punch';
          else if (row.working_hours !== null && parseFloat(row.working_hours) < expectedHours) empStatus = 'Half Day';
          else if (row.status === 'Half Day') empStatus = 'Half Day';
          else empStatus = 'Present';
        } else if (row.is_holiday) empStatus = 'Holiday';
        else if (isFuture) {
           if (row.leave_status === 'Approved') empStatus = 'Leave';
           else if (row.wfh_status === 'Approved') empStatus = 'WFH';
           else empStatus = 'Upcoming';
        } else if (row.leave_status === 'Approved') empStatus = 'Leave';
        else if (row.wfh_status === 'Approved') empStatus = 'WFH';
        else if (isWeekend) empStatus = 'Weekend';
        else if (dateStr < todayStr) empStatus = 'Absent';
        else empStatus = 'No Record';
        
        const empName = `${row.first_name} ${row.last_name}`;
        if (empStatus === 'Present') aggByDate[dateStr].present.push(empName);
        else if (empStatus === 'Absent') aggByDate[dateStr].absent.push(empName);
        else if (empStatus === 'Leave') aggByDate[dateStr].leave.push(empName);
        else if (empStatus === 'WFH') aggByDate[dateStr].wfh.push(empName);
        else if (empStatus === 'Holiday') aggByDate[dateStr].holiday.push(empName);
        else if (empStatus === 'Miss Punch') aggByDate[dateStr].miss_punch.push(empName);
        else if (empStatus === 'Half Day') aggByDate[dateStr].half_day.push(empName);
        else if (empStatus === 'No Record') aggByDate[dateStr].no_record.push(empName);
      });
      
      return success(res, { calendar: Object.values(aggByDate), month: m, year: y, daysInMonth });
    }

    const recordsRes = await query(
      `SELECT to_char(d.date, 'YYYY-MM-DD') as date,
              a.status, a.punch_in, a.punch_out, a.actual_punch_in, a.actual_punch_out, a.biometric_sync, a.is_regularized, a.working_hours, a.location, a.photo_url,
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
      [startDate, endDate, eId]
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
        if (!row.punch_out && dateStr < todayStr) {
          computedStatus = 'Miss Punch';
        } else if (row.working_hours !== null && parseFloat(row.working_hours) < expectedHours) {
          computedStatus = 'Half Day';
        } else if (row.status === 'Half Day') {
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
        actual_punch_in: row.actual_punch_in,
        actual_punch_out: row.actual_punch_out,
        biometric_sync: row.biometric_sync,
        is_regularized: row.is_regularized,
        working_hours: row.working_hours,
        location: row.location,
        photo_url: row.photo_url,
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

    if (eId === 'all') {
      const result = await query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'Present' OR status = 'Half Day') as present,
          COUNT(*) FILTER (WHERE status = 'Absent') as absent,
          COUNT(*) FILTER (WHERE status = 'Half Day') as half_days,
          COUNT(*) FILTER (WHERE status = 'WFH' OR (status = 'Approved' AND EXISTS(SELECT 1 FROM wfh_requests w WHERE w.emp_id = attendance_records.emp_id AND w.date = attendance_records.date))) as wfh,
          COUNT(*) FILTER (WHERE status = 'Leave' OR (status = 'Approved' AND EXISTS(SELECT 1 FROM leave_applications l WHERE l.emp_id = attendance_records.emp_id AND attendance_records.date BETWEEN l.from_date AND l.to_date))) as leave_days,
          COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM punch_in::time) > EXTRACT(EPOCH FROM '09:15:00'::time)) as late
         FROM attendance_records
         WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2`,
        [m, y]
      );
      return success(res, result.rows[0] || {}, 'Monthly stats fetched successfully');
    }

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

    const { location, photo } = req.body;
    let photoUrl = null;
    let locStr = null;
    if (location) locStr = typeof location === 'string' ? location : JSON.stringify(location);
    
    if (photo) {
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
      const filename = `punch_${emp_id}_${Date.now()}.webp`;
      const uploadsDir = path.join(__dirname, '../../uploads/attendance');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, filename), base64Data, 'base64');
      photoUrl = `/uploads/attendance/${filename}`;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const existing = await query(`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = $2`, [emp_id, todayStr]);

    if (existing.rows.length > 0) {
      if (!existing.rows[0].punch_out) {
        if (!existing.rows[0].punch_in) {
          const result = await query(
            `UPDATE attendance_records SET punch_in = CURRENT_TIME, status = 'Present', biometric_sync = true, location = COALESCE($2, location), photo_url = COALESCE($3, photo_url), updated_at = NOW() WHERE id = $1 RETURNING *`,
            [existing.rows[0].id, locStr, photoUrl]
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
        
        const settings = await query(`SELECT * FROM attendance_settings LIMIT 1`);
        const shift = settings.rows[0] || { shift_start: '09:00:00', shift_end: '18:00:00', grace_period_mins: 30 };
        
        let expectedHours = 9;
        if (shift.shift_start && shift.shift_end) {
          const [sh, sm] = shift.shift_start.split(':');
          const [eh, em] = shift.shift_end.split(':');
          expectedHours = (parseInt(eh)*60 + parseInt(em) - (parseInt(sh)*60 + parseInt(sm))) / 60.0;
        }

        const lateCheck = await query(
          `SELECT $1::TIME > ($2::TIME + ($3 || ' minutes')::INTERVAL) as is_late`,
          [inTime, shift.shift_start, shift.grace_period_mins]
        );
        const isLateBeyondGrace = lateCheck.rows[0].is_late;
        
        let outStatus = 'Present';
        if (workingHours < expectedHours || isLateBeyondGrace) {
          outStatus = 'Half Day';
        }

        const result = await query(
          `UPDATE attendance_records SET punch_out = $1, working_hours = $2, status = $3, location = COALESCE($5, location), photo_url = COALESCE($6, photo_url), updated_at = NOW() WHERE id = $4 RETURNING *`,
          [outTime, workingHours.toFixed(1), outStatus, existing.rows[0].id, locStr, photoUrl]
        );
        return success(res, result.rows[0], 'Biometric sync: Punched out successfully');
      }
      return success(res, existing.rows[0], 'Biometric sync: Already punched out today');
    }

    const result = await query(
      `INSERT INTO attendance_records (emp_id, date, punch_in, actual_punch_in, status, biometric_sync, location, photo_url)
       VALUES ($1, $2, CURRENT_TIME, CURRENT_TIME, 'Present', true, $3, $4) RETURNING *`,
      [emp_id, todayStr, locStr, photoUrl]
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
    const shift = settings.rows[0] || { shift_start: '09:00:00', shift_end: '18:00:00', grace_period_mins: 30 };

    let expectedHours = 9;
    if (shift.shift_start && shift.shift_end) {
      const [sh, sm] = shift.shift_start.split(':');
      const [eh, em] = shift.shift_end.split(':');
      expectedHours = (parseInt(eh)*60 + parseInt(em) - (parseInt(sh)*60 + parseInt(sm))) / 60.0;
    }

    const existing = await query(`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = CURRENT_DATE`, [emp_id]);

    if (existing.rows.length > 0) {
      if (!existing.rows[0].punch_out) {
        if (!existing.rows[0].punch_in) {
          const result = await query(
            `UPDATE attendance_records SET punch_in = CURRENT_TIME, actual_punch_in = CURRENT_TIME, status = 'Present', updated_at = NOW() WHERE id = $1 RETURNING *`,
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
        
        const lateCheck = await query(
          `SELECT $1::TIME > ($2::TIME + ($3 || ' minutes')::INTERVAL) as is_late`,
          [inTime, shift.shift_start, shift.grace_period_mins]
        );
        const isLateBeyondGrace = lateCheck.rows[0].is_late;
        
        let outStatus = 'Present';
        if (workingHours < expectedHours || isLateBeyondGrace) {
          outStatus = 'Half Day';
        }

        const result = await query(
          `UPDATE attendance_records SET punch_out = $1, actual_punch_out = $1, working_hours = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
          [outTime, workingHours.toFixed(1), outStatus, existing.rows[0].id]
        );
        return success(res, result.rows[0], 'Punched out successfully');
      }
      return error(res, 'Already punched out today', 400);
    }

    const result = await query(
      `INSERT INTO attendance_records (emp_id, date, punch_in, actual_punch_in, status, biometric_sync)
       VALUES ($1, CURRENT_DATE, CURRENT_TIME, CURRENT_TIME,
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
    const existing = await query(`SELECT * FROM regularization_requests WHERE emp_id = $1 AND date = $2 AND status IN ('Pending', 'Approved')`, [emp_id, date]);
    if (existing.rows.length > 0) return error(res, 'A pending or approved regularization request already exists for this date', 400);

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
  const { date, reason, half_day_type, wfh_type } = req.body;
  const emp_id = req.user.emp_id;
  try {
    // Check for conflicting WFH on same slot
    const existing = await query(
      `SELECT * FROM wfh_requests WHERE emp_id = $1 AND date = $2 AND status IN ('Pending', 'Approved')`,
      [emp_id, date]
    );
    for (const ex of existing.rows) {
      const exSlot = ex.half_day_type || 'FULL_DAY';
      const newSlot = (wfh_type === 'half_day' && half_day_type) ? half_day_type : 'FULL_DAY';
      // Full day blocks everything, same slot blocks
      if (exSlot === 'FULL_DAY' || newSlot === 'FULL_DAY' || exSlot === newSlot) {
        return error(res, `A WFH request already exists for this slot on ${date}`, 400);
      }
    }

    const finalHalfDay = (wfh_type === 'half_day' && half_day_type) ? half_day_type : null;
    const result = await query(
      `INSERT INTO wfh_requests (emp_id, date, reason, half_day_type, wfh_type) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [emp_id, date, reason, finalHalfDay, wfh_type || 'full_day']
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


exports.exportCSV = async (req, res) => {
  const { month, year, emp_id } = req.query;
  try {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const daysInMonth = getDaysInMonth(y, m);
    const startDate = `${y}-${String(m).padStart(2,'0')}-01`;
    const endDate = `${y}-${String(m).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;

    let eId = null;
    if (req.user.role === 'employee') {
      eId = req.user.emp_id;
    } else if (emp_id) {
      eId = emp_id;
    }

    const settingsRes = await query(`SELECT shift_start, shift_end FROM attendance_settings LIMIT 1`);
    let expectedHours = 9;
    if (settingsRes.rows.length > 0 && settingsRes.rows[0].shift_start && settingsRes.rows[0].shift_end) {
      const [sh, sm] = settingsRes.rows[0].shift_start.split(':');
      const [eh, em] = settingsRes.rows[0].shift_end.split(':');
      expectedHours = (parseInt(eh)*60 + parseInt(em) - (parseInt(sh)*60 + parseInt(sm))) / 60.0;
    }

    let recordsRes;
    if (eId) {
      recordsRes = await query(
        `SELECT 
            e.emp_id, e.first_name, e.last_name, e.mobile, to_char(e.doj, 'DD-MM-YYYY') as doj, e.posting_station as branch,
            d_dept.name as department, desig.name as designation,
            to_char(d.date, 'YYYY-MM-DD') as date,
            a.status, a.punch_in, a.punch_out, a.working_hours,
            l.leave_type, l.status as leave_status,
            w.status as wfh_status,
            CASE WHEN h.id IS NOT NULL THEN h.name ELSE '' END as holiday_name
         FROM generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) AS d(date)
         CROSS JOIN (SELECT emp_id, first_name, last_name, mobile, doj, posting_station, dept_id, designation_id FROM employees WHERE emp_id = $3) e
         LEFT JOIN departments d_dept ON e.dept_id = d_dept.id
         LEFT JOIN designations desig ON e.designation_id = desig.id
         LEFT JOIN attendance_records a ON a.emp_id = e.emp_id AND a.date = d.date
         LEFT JOIN leave_applications l ON l.emp_id = e.emp_id AND d.date BETWEEN l.from_date AND l.to_date AND l.status = 'Approved'
         LEFT JOIN wfh_requests w ON w.emp_id = e.emp_id AND w.date = d.date AND w.status = 'Approved'
         LEFT JOIN holidays h ON h.date = d.date
         ORDER BY d.date`,
        [startDate, endDate, eId]
      );
    } else {
      recordsRes = await query(
        `SELECT 
            e.emp_id, e.first_name, e.last_name, e.mobile, to_char(e.doj, 'DD-MM-YYYY') as doj, e.posting_station as branch,
            d_dept.name as department, desig.name as designation,
            to_char(d.date, 'YYYY-MM-DD') as date,
            a.status, a.punch_in, a.punch_out, a.working_hours,
            l.leave_type, l.status as leave_status,
            w.status as wfh_status,
            CASE WHEN h.id IS NOT NULL THEN h.name ELSE '' END as holiday_name
         FROM employees e
         CROSS JOIN generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) AS d(date)
         LEFT JOIN departments d_dept ON e.dept_id = d_dept.id
         LEFT JOIN designations desig ON e.designation_id = desig.id
         LEFT JOIN attendance_records a ON a.emp_id = e.emp_id AND a.date = d.date
         LEFT JOIN leave_applications l ON l.emp_id = e.emp_id AND d.date BETWEEN l.from_date AND l.to_date AND l.status = 'Approved'
         LEFT JOIN wfh_requests w ON w.emp_id = e.emp_id AND w.date = d.date AND w.status = 'Approved'
         LEFT JOIN holidays h ON h.date = d.date
         WHERE e.status = 'Active'
         ORDER BY e.emp_id, d.date`,
        [startDate, endDate]
      );
    }

    const empData = {};
    const todayStr = new Date().toISOString().split('T')[0];

    recordsRes.rows.forEach(row => {
      if (!empData[row.emp_id]) {
        empData[row.emp_id] = {
          emp_id: row.emp_id,
          name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
          mobile: row.mobile || '',
          doj: row.doj || '',
          branch: row.branch || '',
          department: row.department || '',
          designation: row.designation || '',
          days: {},
          totals: {
            present: 0, absent: 0, half_day: 0, miss_punch: 0, week_off: 0, holiday: 0, leave: 0
          }
        };
      }

      const dateStr = row.date;
      const isWeekend = new Date(dateStr + 'T00:00:00').getDay() === 0 || new Date(dateStr + 'T00:00:00').getDay() === 6;
      const isFuture = dateStr > todayStr;

      let code = '';
      if (row.punch_in) {
        if (row.working_hours !== null && parseFloat(row.working_hours) < expectedHours) {
          code = 'HD';
        } else if (row.status === 'Half Day') {
          code = 'HD';
        } else {
          code = 'P';
        }
      } else if (row.holiday_name) {
        code = 'H';
      } else if (isFuture) {
        if (row.leave_status === 'Approved') code = row.leave_type;
        else if (row.wfh_status === 'Approved') code = 'WFH';
        else code = '';
      } else if (row.leave_status === 'Approved') {
        code = row.leave_type;
      } else if (row.wfh_status === 'Approved') {
        code = 'WFH';
      } else if (isWeekend) {
        code = 'WO';
      } else if (dateStr < todayStr) {
        code = 'A';
      } else {
        code = '';
      }

      let inTime = '';
      let outTime = '';
      const [year, month, day] = dateStr.split('-');
      const formattedDate = `${day}-${month}-${year}`;

      if (row.punch_in) {
        inTime = `${formattedDate} ${row.punch_in.slice(0, 8)}`;
      }
      if (row.punch_out) {
        outTime = `${formattedDate} ${row.punch_out.slice(0, 8)}`;
      }

      const wh = row.working_hours;
      let finalWh = '';
      if ((!wh || parseFloat(wh) === 0) && row.punch_in && row.punch_out) {
        const [ih, im] = row.punch_in.split(':');
        const [oh, om] = row.punch_out.split(':');
        const diff = (parseInt(oh)*60+parseInt(om)) - (parseInt(ih)*60+parseInt(im));
        const hrs = Math.floor(diff / 60);
        const mins = diff % 60;
        finalWh = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
      } else if (wh && parseFloat(wh) > 0) {
        const hrs = Math.floor(parseFloat(wh));
        const mins = Math.round((parseFloat(wh) - hrs) * 60);
        finalWh = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
      }

      empData[row.emp_id].days[dateStr] = {
        status: code,
        punch_in: inTime,
        punch_out: outTime,
        working_hours: finalWh
      };

      if (!isFuture && dateStr <= todayStr) {
        if (code === 'P') empData[row.emp_id].totals.present++;
        else if (code === 'A') empData[row.emp_id].totals.absent++;
        else if (code === 'HD') empData[row.emp_id].totals.half_day++;
        else if (code === 'WO') empData[row.emp_id].totals.week_off++;
        else if (code === 'H') empData[row.emp_id].totals.holiday++;
        else if (code !== '') empData[row.emp_id].totals.leave++;
        
        if (row.punch_in && !row.punch_out && dateStr < todayStr) {
          empData[row.emp_id].totals.miss_punch++;
        }
      }
    });

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '';
      const s = String(str);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const dateHeaders = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dateHeaders.push(`${String(d).padStart(2,'0')}-${String(m).padStart(2,'0')}-${y}`);
    }

    const headers = [
      'Sr No.', 'Employee Code', 'Employee Name', 'Employee Number', 'Joining Date', 
      'Branch', 'Department', 'Designation', 'Division', 'Working Area', 'Project',
      'Present', 'Absent', 'Half Day', 'Miss Punch', 'Week Off', 'Holiday', 
      'Approved Leave', 'Pending Leave', 'Approved OutDuty', 'Pending OutDuty', ' '
    ];

    let csvContent = headers.concat(dateHeaders).map(escapeCsv).join(',') + '\n';

    let srNo = 1;
    for (const emp_id in empData) {
      const emp = empData[emp_id];
      const emptyBase = Array(21).fill('');
      
      const statusRow = [
        srNo++, emp.emp_id, emp.name, emp.mobile, emp.doj,
        emp.branch, emp.department, emp.designation, '', '', '',
        emp.totals.present, emp.totals.absent, emp.totals.half_day, emp.totals.miss_punch, 
        emp.totals.week_off, emp.totals.holiday, emp.totals.leave, 0, 0, 0, 'Status'
      ];
      
      const inRow = [...emptyBase];
      inRow[21] = 'IN';
      
      const outRow = [...emptyBase];
      outRow[21] = 'OUT';
      
      const whRow = [...emptyBase];
      whRow[21] = 'Working Hours';

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dayData = emp.days[dateStr] || { status: '', punch_in: '', punch_out: '', working_hours: '' };
        
        statusRow.push(dayData.status);
        inRow.push(dayData.punch_in);
        outRow.push(dayData.punch_out);
        whRow.push(dayData.working_hours);
      }

      csvContent += statusRow.map(escapeCsv).join(',') + '\n';
      csvContent += inRow.map(escapeCsv).join(',') + '\n';
      csvContent += outRow.map(escapeCsv).join(',') + '\n';
      csvContent += whRow.map(escapeCsv).join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Attendance_Report_${y}_${String(m).padStart(2,'0')}.csv`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Export CSV Error:', err);
    return error(res, err.message, 500);
  }
};

// ─── CANCEL WFH ───
exports.cancelWFH = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const wfhData = await query(`SELECT * FROM wfh_requests WHERE id = $1`, [id]);
    if (!wfhData.rows.length) return error(res, 'WFH request not found', 404);
    const w = wfhData.rows[0];
    const isAdmin = ['super_admin', 'hr_manager', 'hr_staff'].includes(req.user.role);
    const isOwner = req.user.emp_id === w.emp_id;

    if (w.status === 'Cancelled') return error(res, 'Already cancelled', 400);
    if (w.status === 'Rejected') return error(res, 'Cannot cancel a rejected request', 400);
    if (w.status === 'Approved' && !isAdmin) return error(res, 'Only Admin/HR can cancel approved requests', 403);
    if (w.status === 'Pending' && !isOwner && !isAdmin) return error(res, 'Not authorized', 403);

    await query(
      `UPDATE wfh_requests SET status = 'Cancelled', cancelled_by = $1, cancel_reason = $2, updated_at = NOW() WHERE id = $3`,
      [req.user.id, reason || null, id]
    );

    // If it was approved, revert attendance
    if (w.status === 'Approved') {
      await query(
        `DELETE FROM attendance_records WHERE emp_id = $1 AND date = $2 AND status = 'WFH' AND punch_in IS NULL`,
        [w.emp_id, w.date]
      );
    }

    return success(res, null, 'WFH request cancelled');
  } catch (err) { return error(res, err.message, 500); }
};

// ─── CANCEL REGULARIZATION ───
exports.cancelRegularization = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const regData = await query(`SELECT * FROM regularization_requests WHERE id = $1`, [id]);
    if (!regData.rows.length) return error(res, 'Regularization request not found', 404);
    const r = regData.rows[0];
    const isAdmin = ['super_admin', 'hr_manager', 'hr_staff'].includes(req.user.role);
    const isOwner = req.user.emp_id === r.emp_id;

    if (r.status === 'Cancelled') return error(res, 'Already cancelled', 400);
    if (r.status === 'Rejected') return error(res, 'Cannot cancel a rejected request', 400);
    if (r.status === 'Approved' && !isAdmin) return error(res, 'Only Admin/HR can cancel approved requests', 403);
    if (r.status === 'Pending' && !isOwner && !isAdmin) return error(res, 'Not authorized', 403);

    await query(
      `UPDATE regularization_requests SET status = 'Cancelled', cancelled_by = $1, cancel_reason = $2, updated_at = NOW() WHERE id = $3`,
      [req.user.id, reason || null, id]
    );

    // If it was approved, completely revert the attendance record changes
    if (r.status === 'Approved') {
      const attData = await query(`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = $2 AND is_regularized = true`, [r.emp_id, r.date]);
      if (attData.rows.length > 0) {
        const att = attData.rows[0];
        
        if (!att.actual_punch_in && !att.actual_punch_out) {
          // Record was purely created by regularization (Absent day)
          // We can just delete it, or reset to absent
          await query(`DELETE FROM attendance_records WHERE id = $1`, [att.id]);
        } else {
          // Revert to original actual punches
          const origIn = att.actual_punch_in;
          const origOut = att.actual_punch_out;
          
          let origWh = null;
          if (origIn && origOut) {
            const [ih, im] = origIn.split(':');
            const [oh, om] = origOut.split(':');
            const diff = (parseInt(oh)*60 + parseInt(om)) - (parseInt(ih)*60 + parseInt(im));
            origWh = Math.max(0, diff / 60).toFixed(1);
          }

          let origStatus = 'Absent';
          if (origIn && !origOut) origStatus = 'Miss Punch';
          else if (origIn && origOut) {
            const settings = await query(`SELECT * FROM attendance_settings LIMIT 1`);
            let expectedHours = 9;
            if (settings.rows[0]?.shift_start && settings.rows[0]?.shift_end) {
              const [sh, sm] = settings.rows[0].shift_start.split(':');
              const [eh, em] = settings.rows[0].shift_end.split(':');
              expectedHours = (parseInt(eh)*60 + parseInt(em) - (parseInt(sh)*60 + parseInt(sm))) / 60.0;
            }
            origStatus = (origWh < expectedHours) ? 'Half Day' : 'Present';
          }

          await query(
            `UPDATE attendance_records SET punch_in = $1, punch_out = $2, working_hours = $3, status = $4, is_regularized = false, updated_at = NOW() WHERE id = $5`,
            [origIn, origOut, origWh, origStatus, att.id]
          );
        }
      }
    }

    return success(res, null, 'Regularization request cancelled');
  } catch (err) { return error(res, err.message, 500); }
};
