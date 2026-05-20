const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  try {
    const result = await query(
      `SELECT d.*, 
              (SELECT COUNT(*) FROM employees e WHERE e.dept_id = d.id AND e.status = 'Active') as employee_count
       FROM departments d WHERE d.is_active = true ORDER BY d.name`
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.create = async (req, res) => {
  const { name, code, description } = req.body;
  if (!name || !code) return error(res, 'Name and code required.', 400);
  try {
    const result = await query(
      'INSERT INTO departments(name,code,description) VALUES($1,$2,$3) RETURNING *',
      [name, code.toUpperCase(), description || null]
    );
    return success(res, result.rows[0], 'Department created', 201);
  } catch (err) {
    if (err.code === '23505') return error(res, 'Department name or code already exists.', 409);
    return error(res, err.message);
  }
};

exports.update = async (req, res) => {
  const { name, code, description, is_active } = req.body;
  try {
    const result = await query(
      'UPDATE departments SET name=COALESCE($1,name), code=COALESCE($2,code), description=COALESCE($3,description), is_active=COALESCE($4,is_active), updated_at=NOW() WHERE id=$5 RETURNING *',
      [name, code, description, is_active, req.params.id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

exports.designations = async (req, res) => {
  try {
    const result = await query('SELECT * FROM designations ORDER BY pay_level_min');
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};