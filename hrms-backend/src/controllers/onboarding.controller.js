const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  const { status } = req.query;
  const conditions = status ? ['oc.status=$1'] : [];
  const params = status ? [status] : [];
  const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
  try {
    const result = await query(
      `SELECT oc.*, d.name as dept_name_full FROM onboarding_candidates oc
       LEFT JOIN departments d ON d.id=oc.dept_id
       ${where} ORDER BY oc.created_at DESC`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.create = async (req, res) => {
  const { candidate_ref_id, name, post, dept_id, dept_name, selection_date, joining_date } = req.body;
  if (!name||!post) return error(res,'name and post required.',400);
  try {
    const result = await query(
      `INSERT INTO onboarding_candidates(candidate_ref_id,name,post,dept_id,dept_name,selection_date,joining_date,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [candidate_ref_id||null,name,post,dept_id||null,dept_name||null,selection_date||null,joining_date||null,req.user.id]
    );
    return success(res, result.rows[0], 'Candidate added to onboarding', 201);
  } catch (err) { return error(res, err.message); }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { documents_submitted, medical_cleared, police_verification, appointment_letter_sent,
          service_book_created, emp_id_assigned, status, remarks } = req.body;
  try {
    const result = await query(
      `UPDATE onboarding_candidates SET
         documents_submitted=COALESCE($1,documents_submitted),
         medical_cleared=COALESCE($2,medical_cleared),
         police_verification=COALESCE($3,police_verification),
         appointment_letter_sent=COALESCE($4,appointment_letter_sent),
         service_book_created=COALESCE($5,service_book_created),
         emp_id_assigned=COALESCE($6,emp_id_assigned),
         status=COALESCE($7,status), remarks=COALESCE($8,remarks), updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [documents_submitted,medical_cleared,police_verification,appointment_letter_sent,
       service_book_created,emp_id_assigned,status,remarks,id]
    );
    if (!result.rows.length) return error(res,'Not found.',404);
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};