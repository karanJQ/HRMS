const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.listPrograms = async (req, res) => {
  const { dept, status } = req.query;
  const conditions = [], params = [];
  let idx = 1;
  if (dept) { conditions.push(`tp.dept_id=$${idx++}`); params.push(dept); }
  if (status) { conditions.push(`tp.status=$${idx++}`); params.push(status); }
  if (req.user.role==='dept_head') { conditions.push(`tp.dept_id=$${idx++}`); params.push(req.user.dept_id); }
  const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
  try {
    const result = await query(
      `SELECT tp.*, d.name as dept_name,
        (SELECT COUNT(*) FROM training_enrollments te WHERE te.program_id=tp.id) as enrolled_count
       FROM training_programs tp LEFT JOIN departments d ON d.id=tp.dept_id
       ${where} ORDER BY tp.start_date DESC`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.createProgram = async (req, res) => {
  const { title, dept_id, description, start_date, end_date, venue, capacity, is_mandatory, training_type, provider_name, fee_per_person } = req.body;
  if (!title) return error(res,'title required.',400);
  try {
    const result = await query(
      `INSERT INTO training_programs(title,dept_id,description,start_date,end_date,venue,capacity,is_mandatory,training_type,provider_name,fee_per_person,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [title,dept_id||null,description||null,start_date||null,end_date||null,venue||null,capacity||30,is_mandatory||false,training_type||null,provider_name||null,fee_per_person||0,req.user.id]
    );
    return success(res, result.rows[0], 'Training program created', 201);
  } catch (err) { return error(res, err.message); }
};

exports.updateProgram = async (req, res) => {
  const { id } = req.params;
  const { title, status, start_date, end_date, venue, capacity, is_mandatory } = req.body;
  try {
    const result = await query(
      `UPDATE training_programs SET title=COALESCE($1,title), status=COALESCE($2,status),
       start_date=COALESCE($3,start_date), end_date=COALESCE($4,end_date),
       venue=COALESCE($5,venue), capacity=COALESCE($6,capacity),
       is_mandatory=COALESCE($7,is_mandatory), updated_at=NOW() WHERE id=$8 RETURNING *`,
      [title,status,start_date,end_date,venue,capacity,is_mandatory,id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

exports.enroll = async (req, res) => {
  const { program_id, emp_id } = req.body;
  if (!program_id||!emp_id) return error(res,'program_id and emp_id required.',400);
  try {
    const prog = await query('SELECT * FROM training_programs WHERE id=$1',[program_id]);
    if (!prog.rows.length) return error(res,'Program not found.',404);
    const enrolled = await query('SELECT COUNT(*) FROM training_enrollments WHERE program_id=$1',[program_id]);
    if (parseInt(enrolled.rows[0].count) >= prog.rows[0].capacity)
      return error(res,'Training program is full.',400);
    const result = await query(
      `INSERT INTO training_enrollments(program_id,emp_id) VALUES($1,$2)
       ON CONFLICT(program_id,emp_id) DO NOTHING RETURNING *`,
      [program_id, emp_id]
    );
    return success(res, result.rows[0]||null, 'Enrolled successfully', 201);
  } catch (err) { return error(res, err.message); }
};

exports.listEnrollments = async (req, res) => {
  const { program_id, emp_id } = req.query;
  const conditions = [], params = [];
  let idx = 1;
  if (program_id) { conditions.push(`te.program_id=$${idx++}`); params.push(program_id); }
  if (emp_id) { conditions.push(`te.emp_id=$${idx++}`); params.push(emp_id); }
  if (req.user.role==='employee') { conditions.push(`te.emp_id=$${idx++}`); params.push(req.user.emp_id); }
  const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
  try {
    const result = await query(
      `SELECT te.*, e.first_name||' '||e.last_name as emp_name, tp.title as program_title
       FROM training_enrollments te
       JOIN employees e ON e.emp_id=te.emp_id
       JOIN training_programs tp ON tp.id=te.program_id
       ${where} ORDER BY te.enrollment_date DESC`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};