const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  const conditions = [], params = [];
  let idx = 1;
  if (req.query.status) { conditions.push(`p.status=$${idx++}`); params.push(req.query.status); }
  if (req.user.role==='dept_head') { conditions.push(`e.dept_id=$${idx++}`); params.push(req.user.dept_id); }
  const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
  try {
    const result = await query(
      `SELECT p.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name
       FROM promotions p JOIN employees e ON e.emp_id=p.emp_id
       JOIN departments d ON d.id=e.dept_id
       ${where} ORDER BY p.created_at DESC`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.create = async (req, res) => {
  const { emp_id, from_designation_id, to_designation_id, from_designation_name, to_designation_name,
          from_pay_level, to_pay_level, dpc_meeting_date, effective_date, basis, remarks } = req.body;
  if (!emp_id||!to_designation_name) return error(res,'emp_id and to_designation_name required.',400);
  try {
    const result = await query(
      `INSERT INTO promotions(emp_id,from_designation_id,to_designation_id,from_designation_name,to_designation_name,
        from_pay_level,to_pay_level,dpc_meeting_date,effective_date,basis,remarks)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [emp_id,from_designation_id||null,to_designation_id||null,from_designation_name||null,to_designation_name,
       from_pay_level||null,to_pay_level||null,dpc_meeting_date||null,effective_date||null,basis||'DPC',remarks||null]
    );
    return success(res, result.rows[0], 'Promotion initiated', 201);
  } catch (err) { return error(res, err.message); }
};

exports.approve = async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  try {
    const pRes = await query('SELECT * FROM promotions WHERE id=$1',[id]);
    if (!pRes.rows.length) return error(res,'Promotion not found.',404);
    const p = pRes.rows[0];
    const yr = new Date().getFullYear();
    const countRes = await query('SELECT COUNT(*) FROM promotions WHERE EXTRACT(YEAR FROM created_at)=$1',[yr]);
    const orderNum = `PRO/${yr}/${String(parseInt(countRes.rows[0].count)).padStart(4,'0')}`;
    await query(
      `UPDATE promotions SET status='Completed', approved_by=$1, order_number=$2, remarks=COALESCE($3,remarks), updated_at=NOW() WHERE id=$4`,
      [req.user.id, orderNum, remarks||null, id]
    );
    // Update employee designation & pay
    if (p.to_designation_id || p.to_pay_level) {
      await query(
        `UPDATE employees SET designation_id=COALESCE($1,designation_id), pay_level=COALESCE($2,pay_level), updated_at=NOW() WHERE emp_id=$3`,
        [p.to_designation_id||null, p.to_pay_level||null, p.emp_id]
      );
    }
    await query(
      `INSERT INTO service_book_entries(emp_id,event_date,event_type,details,order_number,recorded_by,recorded_by_name,is_verified)
       VALUES($1,CURRENT_DATE,'Promotion',$2,$3,$4,$5,true)`,
      [p.emp_id,`Promoted from ${p.from_designation_name} to ${p.to_designation_name} - DPC Order ${orderNum}`,orderNum,req.user.id,req.user.username]
    );
    return success(res, { order_number: orderNum }, 'Promotion approved');
  } catch (err) { return error(res, err.message); }
};

exports.seniorityList = async (req, res) => {
  const { dept } = req.query;
  const conditions = ["e.status='Active'"], params = [];
  if (dept) { conditions.push(`e.dept_id=$1`); params.push(dept); }
  if (req.user.role==='dept_head') { conditions.push(`e.dept_id=$${params.length+1}`); params.push(req.user.dept_id); }
  try {
    const result = await query(
      `SELECT e.emp_id, e.first_name||' '||e.last_name as name, e.doj, e.experience_years,
              e.grade, e.category, des.name as designation_name, d.name as dept_name,
              EXTRACT(YEAR FROM AGE(NOW(), e.doj)) as service_years,
              ROW_NUMBER() OVER (ORDER BY e.doj ASC) as seniority_rank
       FROM employees e
       JOIN departments d ON d.id=e.dept_id
       LEFT JOIN designations des ON des.id=e.designation_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.doj ASC`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};