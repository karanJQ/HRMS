const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  try {
    // Auto-sync: Find any active employees missing from retirement_tracking and insert them
    const missingRes = await query(
      `SELECT e.emp_id, e.dor FROM employees e
       LEFT JOIN retirement_tracking rt ON rt.emp_id = e.emp_id
       WHERE e.status = 'Active' AND rt.emp_id IS NULL`
    );
    for (const row of missingRes.rows) {
      const dor = row.dor || new Date(new Date().setFullYear(new Date().getFullYear() + 30)).toISOString().split('T')[0];
      await query(
        `INSERT INTO retirement_tracking(emp_id, retirement_date) VALUES($1, $2) ON CONFLICT DO NOTHING`,
        [row.emp_id, dor]
      );
    }

    const result = await query(
      `SELECT rt.*, e.first_name||' '||e.last_name as emp_name, e.dob, e.doj,
              d.name as dept_name, des.name as designation_name, e.basic_pay,
              EXTRACT(YEAR FROM AGE(rt.retirement_date, NOW())) as years_left,
              EXTRACT(MONTH FROM AGE(rt.retirement_date, NOW())) as months_left
       FROM retirement_tracking rt
       JOIN employees e ON e.emp_id=rt.emp_id
       JOIN departments d ON d.id=e.dept_id
       LEFT JOIN designations des ON des.id=e.designation_id
       WHERE e.status='Active'
       ORDER BY rt.retirement_date ASC`
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.update = async (req, res) => {
  const { empId } = req.params;
  const { noc_cleared, handover_completed, pension_submitted, gpf_settled,
          medical_certificate, id_returned, gratuity_amount, gpf_final_amount,
          pension_type, pension_order_number, retirement_order_generated, remarks } = req.body;
  try {
    const result = await query(
      `UPDATE retirement_tracking SET
         noc_cleared=COALESCE($1,noc_cleared), handover_completed=COALESCE($2,handover_completed),
         pension_submitted=COALESCE($3,pension_submitted), gpf_settled=COALESCE($4,gpf_settled),
         medical_certificate=COALESCE($5,medical_certificate), id_returned=COALESCE($6,id_returned),
         gratuity_amount=COALESCE($7,gratuity_amount), gpf_final_amount=COALESCE($8,gpf_final_amount),
         pension_type=COALESCE($9,pension_type), pension_order_number=COALESCE($10,pension_order_number),
         retirement_order_generated=COALESCE($11,retirement_order_generated),
         remarks=COALESCE($12,remarks), updated_at=NOW()
       WHERE emp_id=$13 RETURNING *`,
      [noc_cleared,handover_completed,pension_submitted,gpf_settled,medical_certificate,id_returned,
       gratuity_amount,gpf_final_amount,pension_type,pension_order_number,retirement_order_generated,remarks,empId]
    );
    if (!result.rows.length) return error(res,'Record not found.',404);
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};