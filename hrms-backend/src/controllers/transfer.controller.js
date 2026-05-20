const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  const { status, emp_id, dept } = req.query;
  const conditions = [], params = [];
  let idx = 1;
  if (status) { conditions.push(`t.status=$${idx++}`); params.push(status); }
  if (emp_id) { conditions.push(`t.emp_id=$${idx++}`); params.push(emp_id); }
  if (dept)   { conditions.push(`e.dept_id=$${idx++}`); params.push(dept); }
  if (req.user.role==='employee') { conditions.push(`t.emp_id=$${idx++}`); params.push(req.user.emp_id); }
  if (req.user.role==='dept_head') { conditions.push(`e.dept_id=$${idx++}`); params.push(req.user.dept_id); }
  const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
  try {
    const result = await query(
      `SELECT t.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name
       FROM transfers t JOIN employees e ON e.emp_id=t.emp_id
       JOIN departments d ON d.id=e.dept_id
       ${where} ORDER BY t.created_at DESC`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.create = async (req, res) => {
  const { emp_id, from_district, to_district, from_station, to_station, transfer_type, reason, request_date } = req.body;
  if (!emp_id||!to_district) return error(res,'emp_id and to_district required.',400);
  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [emp_id]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${emp_id}' does not exist.`, 404);
    }
    const result = await query(
      `INSERT INTO transfers(emp_id,from_district,to_district,from_station,to_station,transfer_type,reason,request_date,initiated_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [emp_id,from_district||null,to_district,from_station||null,to_station||null,transfer_type||'Admin Initiated',reason||null,request_date||null,req.user.id]
    );
    return success(res, result.rows[0], 'Transfer order created', 201);
  } catch (err) { return error(res, err.message); }
};

exports.approve = async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  try {
    const tRes = await query('SELECT * FROM transfers WHERE id=$1',[id]);
    if (!tRes.rows.length) return error(res,'Transfer not found.',404);
    const t = tRes.rows[0];
    const yr = new Date().getFullYear();
    const countRes = await query('SELECT COUNT(*) FROM transfers WHERE EXTRACT(YEAR FROM created_at)=$1',[yr]);
    const orderNum = `TRF/${yr}/${String(parseInt(countRes.rows[0].count)).padStart(4,'0')}`;
    await query(
      `UPDATE transfers SET status='Completed', approved_by=$1, order_date=CURRENT_DATE,
       order_number=$2, effective_date=CURRENT_DATE, remarks=COALESCE($3,remarks), updated_at=NOW() WHERE id=$4`,
      [req.user.id, orderNum, remarks||null, id]
    );
    // Update employee district & station
    await query(
      `UPDATE employees SET district=$1, posting_station=$2, updated_at=NOW() WHERE emp_id=$3`,
      [t.to_district, t.to_station||t.to_district, t.emp_id]
    );
    // Service book entry
    await query(
      `INSERT INTO service_book_entries(emp_id,event_date,event_type,details,order_number,recorded_by,recorded_by_name,is_verified)
       VALUES($1,CURRENT_DATE,'Transfer',$2,$3,$4,$5,true)`,
      [t.emp_id,`Transferred from ${t.from_district} to ${t.to_district} - Order ${orderNum}`,orderNum,req.user.id,req.user.username]
    );
    return success(res, { order_number: orderNum }, 'Transfer approved');
  } catch (err) { return error(res, err.message); }
};

exports.reject = async (req, res) => {
  const { remarks } = req.body;
  try {
    await query('UPDATE transfers SET status=$1, remarks=$2, updated_at=NOW() WHERE id=$3',
      ['Rejected', remarks||null, req.params.id]);
    return success(res, null, 'Transfer rejected');
  } catch (err) { return error(res, err.message); }
};