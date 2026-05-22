const { query } = require('../config/database');
const { success, error } = require('../utils/response');
const crypto = require('crypto');

exports.getByEmp = async (req, res) => {
  const { empId } = req.params;
  if (req.user.role==='employee' && req.user.emp_id!==empId)
    return error(res,'Access denied.',403);
  try {
    const result = await query(
      `SELECT s.*, u.username as recorder_username
       FROM service_book_entries s LEFT JOIN users u ON u.id=s.recorded_by
       WHERE s.emp_id=$1 ORDER BY s.event_date ASC, s.created_at ASC`, [empId]
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.addEntry = async (req, res) => {
  const { empId } = req.params;
  const { event_date, event_type, details, order_number } = req.body;
  if (!event_date||!event_type||!details) return error(res,'event_date, event_type, details required.',400);
  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [empId]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${empId}' does not exist.`, 404);
    }
    const result = await query(
      `INSERT INTO service_book_entries(emp_id,event_date,event_type,details,order_number,recorded_by,recorded_by_name,is_verified)
       VALUES($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
      [empId, event_date, event_type, details, order_number||null, req.user.id, req.user.username]
    );
    return success(res, result.rows[0], 'Entry added', 201);
  } catch (err) { return error(res, err.message); }
};