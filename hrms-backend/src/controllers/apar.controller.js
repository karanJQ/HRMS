const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  const { year, status } = req.query;
  const fy = year || `${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`;
  const conditions = ['a.financial_year=$1'], params = [fy];
  let idx = 2;
  if (status) { conditions.push(`a.status=$${idx++}`); params.push(status); }
  if (req.user.role==='employee') { conditions.push(`a.emp_id=$${idx++}`); params.push(req.user.emp_id); }
  if (req.user.role==='dept_head') { conditions.push(`e.dept_id=$${idx++}`); params.push(req.user.dept_id); }
  try {
    const result = await query(
      `SELECT a.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name
       FROM apar_records a JOIN employees e ON e.emp_id=a.emp_id
       JOIN departments d ON d.id=e.dept_id
       WHERE ${conditions.join(' AND ')} ORDER BY e.first_name`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.initiate = async (req, res) => {
  const { emp_id, financial_year } = req.body;
  if (!emp_id||!financial_year) return error(res,'emp_id and financial_year required.',400);
  try {
    const result = await query(
      `INSERT INTO apar_records(emp_id,financial_year) VALUES($1,$2)
       ON CONFLICT(emp_id,financial_year) DO NOTHING RETURNING *`,
      [emp_id, financial_year]
    );
    return success(res, result.rows[0]||null, 'APAR initiated', 201);
  } catch (err) { return error(res, err.message); }
};

const statusAfterFill = (self, reporting, reviewing) => {
  if (reviewing) return 'Completed';
  if (reporting) return 'Pending Reviewing Officer';
  if (self) return 'Pending Reporting Officer';
  return 'Pending Self-Assessment';
};

exports.fillSelf = async (req, res) => {
  const { id } = req.params;
  const { self_grade, self_remarks } = req.body;
  if (!self_grade) return error(res,'self_grade required.',400);
  try {
    const cur = await query('SELECT * FROM apar_records WHERE id=$1',[id]);
    if (!cur.rows.length) return error(res,'APAR not found.',404);
    const r = cur.rows[0];
    const status = statusAfterFill(self_grade, r.reporting_grade, r.reviewing_grade);
    const result = await query(
      `UPDATE apar_records SET self_grade=$1, self_remarks=$2, self_date=CURRENT_DATE, status=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [self_grade, self_remarks||null, status, id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

exports.fillReporting = async (req, res) => {
  const { id } = req.params;
  const { reporting_grade, reporting_remarks } = req.body;
  if (!reporting_grade) return error(res,'reporting_grade required.',400);
  try {
    const cur = await query('SELECT * FROM apar_records WHERE id=$1',[id]);
    if (!cur.rows.length) return error(res,'APAR not found.',404);
    const r = cur.rows[0];
    const status = statusAfterFill(r.self_grade, reporting_grade, r.reviewing_grade);
    const result = await query(
      `UPDATE apar_records SET reporting_grade=$1, reporting_remarks=$2, reporting_date=CURRENT_DATE,
       reporting_officer_id=$3, status=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [reporting_grade, reporting_remarks||null, req.user.id, status, id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

exports.fillReviewing = async (req, res) => {
  const { id } = req.params;
  const { reviewing_grade, reviewing_remarks, final_grade, final_remarks } = req.body;
  if (!reviewing_grade||!final_grade) return error(res,'reviewing_grade and final_grade required.',400);
  try {
    const result = await query(
      `UPDATE apar_records SET reviewing_grade=$1, reviewing_remarks=$2, reviewing_date=CURRENT_DATE,
       reviewing_officer_id=$3, final_grade=$4, final_remarks=$5, status='Completed', updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [reviewing_grade, reviewing_remarks||null, req.user.id, final_grade, final_remarks||null, id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};