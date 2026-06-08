const { query } = require('../config/database');
const { success, error } = require('../utils/response');

const toLocalDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const getWorkingDays = async (from_date, to_date) => {
  const holidaysRes = await query(`SELECT date, type FROM holidays WHERE date >= $1 AND date <= $2`, [from_date, to_date]);
  const holidayStrings = holidaysRes.rows.map(r => toLocalDateStr(new Date(r.date)));

  let days = 0;
  let curr = new Date(from_date);
  const end = new Date(to_date);
  while (curr <= end) {
    const dayOfWeek = curr.getDay();
    const dateStr = toLocalDateStr(curr);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayStrings.includes(dateStr);
    if (!isWeekend && !isHoliday) days++;
    curr.setDate(curr.getDate() + 1);
  }
  return days;
};

exports.listApplications = async (req, res) => {
  const { status, emp_id, dept, year, month } = req.query;
  const conditions = [], params = [];
  let idx = 1;
  if (status) { conditions.push(`la.status=$${idx++}`); params.push(status); }
  if (emp_id) { conditions.push(`la.emp_id=$${idx++}`); params.push(emp_id); }
  if (dept)   { conditions.push(`e.dept_id=$${idx++}`); params.push(dept); }
  if (year)   { conditions.push(`EXTRACT(YEAR FROM la.from_date)=$${idx++}`); params.push(year); }
  if (month)  { conditions.push(`EXTRACT(MONTH FROM la.from_date)=$${idx++}`); params.push(month); }
  if (req.user.role === 'employee') { conditions.push(`la.emp_id=$${idx++}`); params.push(req.user.emp_id); }
  if (req.user.role === 'dept_head') { conditions.push(`e.dept_id=$${idx++}`); params.push(req.user.dept_id); }
  const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
  try {
    const result = await query(
      `SELECT la.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name
       FROM leave_applications la
       JOIN employees e ON e.emp_id=la.emp_id
       JOIN departments d ON d.id=e.dept_id
       ${where} ORDER BY la.created_at DESC`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.apply = async (req, res) => {
  const { emp_id, leave_type, from_date, to_date, reason, half_day_type, contact_number, leave_address } = req.body;
  if (!emp_id||!leave_type||!from_date||!to_date||!reason)
    return error(res,'Please fill in all required fields.',400);
  const eid = req.user.role==='employee' ? req.user.emp_id : emp_id;
  if (!eid) return error(res, 'Employee ID is required.', 400);

  if (new Date(from_date) > new Date(to_date)) return error(res,'Invalid date range.',400);
  try {
    const days = await getWorkingDays(from_date, to_date);
    if (days<=0) return error(res,'0 working days in selected range (weekends/holidays).',400);

    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [eid]);
    if (!empCheck.rows.length) return error(res, `Employee with ID '${eid}' does not exist.`, 404);

    // Overlapping leave check
    const overlapCheck = await query(
      `SELECT * FROM leave_applications 
       WHERE emp_id = $1 
         AND status IN ('Pending', 'Approved') 
         AND from_date <= $3 AND to_date >= $2`,
      [eid, from_date, to_date]
    );
    if (overlapCheck.rows.length > 0) {
      return error(res, 'A leave application already exists for the selected dates.', 400);
    }

    // For half-day, days is always 0.5
    const actualDays = half_day_type ? 0.5 : days;
    const result = await query(
      `INSERT INTO leave_applications(emp_id,leave_type,from_date,to_date,days,reason,half_day_type,contact_number,leave_address)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [eid, leave_type, from_date, to_date, actualDays, reason, half_day_type || null, contact_number || null, leave_address || null]
    );

    // Record attendance as 'Leave' or 'Half Day' for the date range
    const startDate = new Date(from_date);
    const endDate = new Date(to_date);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = toLocalDateStr(d);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const attStatus = half_day_type ? 'Half Day' : 'Leave';
        await query(
          `INSERT INTO attendance_records (emp_id, date, status, biometric_sync)
           VALUES ($1, $2, $3, false)
           ON CONFLICT (emp_id, date) DO UPDATE SET status = $3`,
          [eid, dateStr, attStatus]
        );
      }
    }

    return success(res, result.rows[0], 'Leave application submitted', 201);
  } catch (err) { return error(res, err.message); }
};

exports.review = async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  if (!['Approved','Rejected'].includes(status)) return error(res,'status must be Approved or Rejected.',400);
  try {
    const appRes = await query('SELECT * FROM leave_applications WHERE id=$1',[id]);
    if (!appRes.rows.length) return error(res,'Application not found.',404);
    const app = appRes.rows[0];
    await query(
      `UPDATE leave_applications SET status=$1, reviewed_by=$2, reviewed_date=NOW(), remarks=$3 WHERE id=$4`,
      [status, req.user.id, remarks||null, id]
    );
    if (status==='Approved') {
      if (!['WFH', 'Outdoor Duty'].includes(app.leave_type)) {
        const yr = new Date(app.from_date).getFullYear();
        const typesMap = { 'CL': 'cl_used', 'EL': 'el_used', 'ML': 'ml_used', 'SL': 'sl_used', 'DL': 'dl_used', 'CCL': 'ccl_used' };
        const col = typesMap[app.leave_type] || 'cl_used';
        await query(
          `INSERT INTO leave_balances(emp_id,year) VALUES($1,$2) ON CONFLICT DO NOTHING`, [app.emp_id, yr]
        );
        const days = parseFloat(app.days);
        await query(
          `UPDATE leave_balances SET ${col}=${col}+$1, updated_at=NOW() WHERE emp_id=$2 AND year=$3`,
          [days, app.emp_id, yr]
        );
      }

      const startDate = new Date(app.from_date);
      const endDate = new Date(app.to_date);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = toLocalDateStr(d);
        const attStatus = app.half_day_type ? 'Half Day' : 'Leave';
        await query(
          `UPDATE attendance_records SET status = $1, updated_at = NOW() WHERE emp_id = $2 AND date = $3`,
          [attStatus, app.emp_id, dateStr]
        );
      }
    } else if (status==='Rejected') {
      const startDate = new Date(app.from_date);
      const endDate = new Date(app.to_date);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = toLocalDateStr(d);
        await query(
          `DELETE FROM attendance_records WHERE emp_id = $1 AND date = $2 AND punch_in IS NULL AND punch_out IS NULL`,
          [app.emp_id, dateStr]
        );
      }
    }
    return success(res, null, `Leave ${status.toLowerCase()}`);
  } catch (err) { return error(res, err.message); }
};

exports.listBalances = async (req, res) => {
  const yr = parseInt(req.query.year) || new Date().getFullYear();
  const conditions = ['lb.year=$1'], params = [yr];
  let idx = 2;
  if (req.user.role==='employee') { conditions.push(`lb.emp_id=$${idx++}`); params.push(req.user.emp_id); }
  if (req.user.role==='dept_head') { conditions.push(`e.dept_id=$${idx++}`); params.push(req.user.dept_id); }
  try {
    const result = await query(
      `SELECT lb.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name, e.doj, e.probation_status
       FROM leave_balances lb
       JOIN employees e ON e.emp_id=lb.emp_id
       JOIN departments d ON d.id=e.dept_id
       WHERE ${conditions.join(' AND ')} ORDER BY e.first_name`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.myLeaveBalances = async (req, res) => {
  const yr = parseInt(req.query.year) || new Date().getFullYear();
  try {
    const result = await query(
      `SELECT lb.*, e.first_name||' '||e.last_name as emp_name, e.probation_status
       FROM leave_balances lb
       JOIN employees e ON e.emp_id=lb.emp_id
       WHERE lb.emp_id=$1 AND lb.year=$2`, [req.user.emp_id, yr]
    );
    if (result.rows.length > 0) {
      const lb = result.rows[0];
      if (lb.probation_status === 'Pending') {
         lb.cl_entitled = 0;
         lb.el_entitled = 0;
         lb.ml_entitled = 0;
         lb.ccl_entitled = 0;
         lb.sl_entitled = 2;
         lb.dl_entitled = 0;
      }
      return success(res, lb);
    }
    return success(res, {});
  } catch (err) { return error(res, err.message); }
};

exports.updateBalance = async (req, res) => {
  const { empId } = req.params;
  const { year, cl_entitled, cl_used, el_entitled, el_used, ml_entitled, ml_used, ccl_entitled, ccl_used, sl_entitled, sl_used, dl_entitled, dl_used } = req.body;
  const yr = parseInt(year) || new Date().getFullYear();
  try {
    await query(
      `INSERT INTO leave_balances(emp_id,year) VALUES($1,$2) ON CONFLICT DO NOTHING`,
      [empId, yr]
    );
    const result = await query(
      `UPDATE leave_balances SET
        cl_entitled=COALESCE($1,cl_entitled), cl_used=COALESCE($2,cl_used),
        el_entitled=COALESCE($3,el_entitled), el_used=COALESCE($4,el_used),
        ml_entitled=COALESCE($5,ml_entitled), ml_used=COALESCE($6,ml_used),
        ccl_entitled=COALESCE($7,ccl_entitled), ccl_used=COALESCE($8,ccl_used),
        sl_entitled=COALESCE($9,sl_entitled), sl_used=COALESCE($10,sl_used),
        dl_entitled=COALESCE($11,dl_entitled), dl_used=COALESCE($12,dl_used),
        updated_at=NOW()
       WHERE emp_id=$13 AND year=$14 RETURNING *`,
      [cl_entitled, cl_used, el_entitled, el_used, ml_entitled, ml_used, ccl_entitled, ccl_used, sl_entitled, sl_used, dl_entitled, dl_used, empId, yr]
    );
    if (!result.rows.length) return error(res, 'Balance not found.', 404);
    return success(res, result.rows[0], 'Leave balance updated');
  } catch (err) { return error(res, err.message); }
};

// ─── CANCEL LEAVE ───
exports.cancelLeave = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const appRes = await query('SELECT * FROM leave_applications WHERE id=$1', [id]);
    if (!appRes.rows.length) return error(res, 'Application not found', 404);
    const app = appRes.rows[0];
    const isAdmin = ['super_admin', 'hr_manager', 'hr_staff'].includes(req.user.role);
    const isOwner = req.user.emp_id === app.emp_id;

    if (app.status === 'Cancelled') return error(res, 'Already cancelled', 400);
    if (app.status === 'Rejected') return error(res, 'Cannot cancel a rejected application', 400);
    if (app.status === 'Approved' && !isAdmin) return error(res, 'Only Admin/HR can cancel approved leave', 403);
    if (app.status === 'Pending' && !isOwner && !isAdmin) return error(res, 'Not authorized', 403);

    await query(
      `UPDATE leave_applications SET status = 'Cancelled', cancelled_by = $1, cancel_reason = $2 WHERE id = $3`,
      [req.user.id, reason || null, id]
    );

    // If it was approved, restore the leave balance
    if (app.status === 'Approved') {
      const yr = new Date(app.from_date).getFullYear();
      const typesMap = { 'CL': 'cl_used', 'EL': 'el_used', 'ML': 'ml_used', 'SL': 'sl_used', 'DL': 'dl_used', 'CCL': 'ccl_used' };
      const col = typesMap[app.leave_type];
      if (col) {
        const days = parseFloat(app.days);
        await query(
          `UPDATE leave_balances SET ${col} = GREATEST(0, ${col} - $1), updated_at = NOW() WHERE emp_id = $2 AND year = $3`,
          [days, app.emp_id, yr]
        );
      }
    }

    // Clean up attendance records created for this leave
    const startDate = new Date(app.from_date);
    const endDate = new Date(app.to_date);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = toLocalDateStr(d);
      await query(
        `DELETE FROM attendance_records WHERE emp_id = $1 AND date = $2 AND status IN ('Leave', 'Half Day') AND punch_in IS NULL AND punch_out IS NULL`,
        [app.emp_id, dateStr]
      );
    }

    return success(res, null, 'Leave application cancelled');
  } catch (err) { return error(res, err.message); }
};
