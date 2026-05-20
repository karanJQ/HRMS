const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  const { status, priority, emp_id } = req.query;
  const conditions = [], params = [];
  let idx = 1;
  if (status) { conditions.push(`g.status=$${idx++}`); params.push(status); }
  if (priority) { conditions.push(`g.priority=$${idx++}`); params.push(priority); }
  if (emp_id) { conditions.push(`g.emp_id=$${idx++}`); params.push(emp_id); }
  if (req.user.role==='employee') { conditions.push(`g.emp_id=$${idx++}`); params.push(req.user.emp_id); }
  if (req.user.role==='dept_head') { conditions.push(`e.dept_id=$${idx++}`); params.push(req.user.dept_id); }
  const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
  try {
    const result = await query(
      `SELECT g.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name,
              u.username as assigned_to_name
       FROM grievances g JOIN employees e ON e.emp_id=g.emp_id
       JOIN departments d ON d.id=e.dept_id
       LEFT JOIN users u ON u.id=g.assigned_to
       ${where} ORDER BY g.created_at DESC`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.create = async (req, res) => {
  const { emp_id, grievance_type, subject, description, priority } = req.body;
  const eid = req.user.role==='employee' ? req.user.emp_id : emp_id;
  if (!eid||!grievance_type||!subject) return error(res,'emp_id, grievance_type, subject required.',400);
  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [eid]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${eid}' does not exist.`, 404);
    }
    const result = await query(
      `INSERT INTO grievances(emp_id,grievance_type,subject,description,priority)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [eid, grievance_type, subject, description||null, priority||'Medium']
    );
    return success(res, result.rows[0], 'Grievance submitted', 201);
  } catch (err) { return error(res, err.message); }
};

exports.assign = async (req, res) => {
  const { id } = req.params;
  const { assigned_to } = req.body;
  try {
    const result = await query(
      `UPDATE grievances SET assigned_to=$1, assigned_date=CURRENT_DATE, status='Under Review', updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [assigned_to, id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

exports.resolve = async (req, res) => {
  const { resolution_remarks } = req.body;
  try {
    const result = await query(
      `UPDATE grievances SET status='Resolved', resolution_remarks=$1, resolution_date=CURRENT_DATE, updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [resolution_remarks||null, req.params.id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

// Disciplinary
exports.listDisc = async (req, res) => {
  try {
    const conditions = [], params = [];
    let idx = 1;
    if (req.user.role==='dept_head') { conditions.push(`e.dept_id=$${idx++}`); params.push(req.user.dept_id); }
    const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
    const result = await query(
      `SELECT dc.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name
       FROM disciplinary_cases dc JOIN employees e ON e.emp_id=dc.emp_id
       JOIN departments d ON d.id=e.dept_id
       ${where} ORDER BY dc.created_at DESC`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.createDisc = async (req, res) => {
  const { emp_id, charge_description, incident_date, case_start_date, inquiry_officer_name } = req.body;
  if (!emp_id||!charge_description) return error(res,'emp_id and charge_description required.',400);
  const yr = new Date().getFullYear();
  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [emp_id]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${emp_id}' does not exist.`, 404);
    }
    const countRes = await query('SELECT COUNT(*) FROM disciplinary_cases WHERE EXTRACT(YEAR FROM created_at)=$1',[yr]);
    const csn = `CS/${yr}/${String(parseInt(countRes.rows[0].count)+1).padStart(4,'0')}`;
    const result = await query(
      `INSERT INTO disciplinary_cases(emp_id,charge_sheet_number,charge_description,incident_date,case_start_date,inquiry_officer_name,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [emp_id, csn, charge_description, incident_date||null, case_start_date||null, inquiry_officer_name||null, req.user.id]
    );
    return success(res, result.rows[0], 'Case registered', 201);
  } catch (err) { return error(res, err.message); }
};

exports.updateDisc = async (req, res) => {
  const { status, penalty_type, penalty_order_number, remarks } = req.body;
  try {
    const result = await query(
      `UPDATE disciplinary_cases SET status=COALESCE($1,status), penalty_type=COALESCE($2,penalty_type),
       penalty_order_number=COALESCE($3,penalty_order_number), remarks=COALESCE($4,remarks), updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [status, penalty_type, penalty_order_number, remarks, req.params.id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};