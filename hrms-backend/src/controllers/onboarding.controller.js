const { query } = require('../config/database');
const { success, error } = require('../utils/response');
const bcrypt = require('bcryptjs');

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
    // 1. Fetch current candidate details
    const candRes = await query('SELECT * FROM onboarding_candidates WHERE id = $1', [id]);
    if (!candRes.rows.length) return error(res, 'Not found.', 404);
    const candidate = candRes.rows[0];

    // 2. Perform the update
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
    const updatedCandidate = result.rows[0];

    // 3. If status is set to 'Completed' and they don't have an emp_id_assigned yet,
    // automatically create employee, service book entry, and user account.
    if (status === 'Completed' && !candidate.emp_id_assigned) {
      // a. Generate emp_id
      const countRes = await query('SELECT COUNT(*) FROM employees');
      const num = parseInt(countRes.rows[0].count) + 1;
      const empId = 'EMP' + String(num).padStart(5, '0');

      // b. Split name into first and last name
      const nameParts = candidate.name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Employee';
      const lastName = nameParts.slice(1).join(' ') || '';

      // c. Find a default designation if none is specified
      let designationId = null;
      if (candidate.post) {
        const desigRes = await query('SELECT id FROM designations WHERE name ILIKE $1 LIMIT 1', [`%${candidate.post}%`]);
        if (desigRes.rows.length) designationId = desigRes.rows[0].id;
      }

      const dob = '1990-01-01'; // Default placeholder (NOT NULL in DB)
      const dor = null; // Blank dor
      const doj = candidate.joining_date || new Date().toISOString().split('T')[0];
      const gender = 'Other'; // Placeholder (NOT NULL in DB)
      const mobile = '0000000000'; // Placeholder (NOT NULL in DB)

      // d. Create employee master record
      await query(
        `INSERT INTO employees(emp_id, first_name, last_name, gender, dob, dor, mobile, dept_id, designation_id, doj, status, category, created_by, probation_days, probation_status, probation_end_date)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Active', 'General', $11, 0, 'N/A', null)`,
        [empId, firstName, lastName, gender, dob, dor, mobile, candidate.dept_id || null, designationId, doj, req.user.id]
      );

      // e. Create service book joining entry
      await query(
        `INSERT INTO service_book_entries(emp_id, event_date, event_type, details, recorded_by, recorded_by_name, is_verified)
         VALUES($1, $2, 'Joining', $3, $4, $5, true)`,
        [empId, doj, `Joined as ${candidate.post} at Gandhinagar`, req.user.id, req.user.username]
      );

      // f. Create leave balance
      const yr = new Date().getFullYear();
      await query('INSERT INTO leave_balances(emp_id, year) VALUES($1, $2) ON CONFLICT DO NOTHING', [empId, yr]);

      // g. (User creation removed per request: HR will create user manually)

      // h. Create retirement tracking record
      await query(
        `INSERT INTO retirement_tracking(emp_id, retirement_date) VALUES($1, $2) ON CONFLICT DO NOTHING`,
        [empId, dor]
      );

      // h. Update candidate with the newly assigned emp_id and service_book_created=true
      const finalCandRes = await query(
        `UPDATE onboarding_candidates 
         SET emp_id_assigned = $1, service_book_created = true, status = 'Completed' 
         WHERE id = $2 RETURNING *`,
        [empId, id]
      );
      
      return success(res, finalCandRes.rows[0]);
    }

    return success(res, updatedCandidate);
  } catch (err) { return error(res, err.message); }
};