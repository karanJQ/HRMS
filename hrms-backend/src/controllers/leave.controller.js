const { query } = require('../config/database');
const { success, error } = require('../utils/response');

const daysBetween = (from, to) => {
  const d = Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1;
  return d > 0 ? d : 0;
};

exports.listApplications = async (req, res) => {
  const { status, emp_id, dept } = req.query;
  const conditions = [], params = [];
  let idx = 1;
  if (status) { conditions.push(`la.status=$${idx++}`); params.push(status); }
  if (emp_id) { conditions.push(`la.emp_id=$${idx++}`); params.push(emp_id); }
  if (dept)   { conditions.push(`e.dept_id=$${idx++}`); params.push(dept); }
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
  const { emp_id, leave_type, from_date, to_date, reason } = req.body;
  if (!emp_id||!leave_type||!from_date||!to_date||!reason)
    return error(res,'emp_id, leave_type, from_date, to_date, reason required.',400);
  const eid = req.user.role==='employee' ? req.user.emp_id : emp_id;
  if (!eid) return error(res, 'Employee ID is required.', 400);
  const days = daysBetween(from_date, to_date);
  if (days<=0) return error(res,'Invalid date range.',400);
  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [eid]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${eid}' does not exist.`, 404);
    }
    const result = await query(
      `INSERT INTO leave_applications(emp_id,leave_type,from_date,to_date,days,reason)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [eid, leave_type, from_date, to_date, days, reason]
    );
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
    // Update leave balance if approved
    if (status==='Approved') {
      const yr = new Date(app.from_date).getFullYear();
      const col = app.leave_type==='CL'?'cl_used':app.leave_type==='EL'?'el_used':app.leave_type==='ML'?'ml_used':'cl_used';
      await query(
        `INSERT INTO leave_balances(emp_id,year) VALUES($1,$2) ON CONFLICT DO NOTHING`, [app.emp_id, yr]
      );
      await query(
        `UPDATE leave_balances SET ${col}=${col}+$1, updated_at=NOW() WHERE emp_id=$2 AND year=$3`,
        [app.days, app.emp_id, yr]
      );
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
      `SELECT lb.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name
       FROM leave_balances lb
       JOIN employees e ON e.emp_id=lb.emp_id
       JOIN departments d ON d.id=e.dept_id
       WHERE ${conditions.join(' AND ')} ORDER BY e.first_name`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};