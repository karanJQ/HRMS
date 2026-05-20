const { query } = require('../config/database');
const { success, error } = require('../utils/response');

const empSelect = `
  SELECT e.*,
    d.name as dept_name, d.code as dept_code,
    des.name as designation_name, des.grade as designation_grade
  FROM employees e
  LEFT JOIN departments d ON d.id = e.dept_id
  LEFT JOIN designations des ON des.id = e.designation_id
`;

exports.list = async (req, res) => {
  const { dept, status, category, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [], params = [];
  let idx = 1;

  if (dept) { conditions.push(`e.dept_id = $${idx++}`); params.push(dept); }
  if (status) { conditions.push(`e.status = $${idx++}`); params.push(status); }
  if (category) { conditions.push(`e.category = $${idx++}`); params.push(category); }
  if (search) {
    conditions.push(`(e.first_name ILIKE $${idx} OR e.last_name ILIKE $${idx} OR e.emp_id ILIKE $${idx} OR e.mobile ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }
  // Dept head can only see own dept
  if (req.user.role === 'dept_head' && req.user.dept_id) {
    conditions.push(`e.dept_id = $${idx++}`); params.push(req.user.dept_id);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  try {
    const countRes = await query(`SELECT COUNT(*) FROM employees e ${where}`, params);
    const result = await query(
      `${empSelect} ${where} ORDER BY e.first_name, e.last_name LIMIT $${idx} OFFSET $${idx+1}`,
      [...params, parseInt(limit), offset]
    );
    return success(res, { employees: result.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { return error(res, err.message); }
};

exports.get = async (req, res) => {
  try {
    const result = await query(`${empSelect} WHERE e.emp_id = $1`, [req.params.empId]);
    if (!result.rows.length) return error(res, 'Employee not found.', 404);
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

exports.create = async (req, res) => {
  const b = req.body;
  try {
    // Auto generate emp_id
    const countRes = await query('SELECT COUNT(*) FROM employees');
    const num = parseInt(countRes.rows[0].count) + 1;
    const emp_id = 'EMP' + String(num).padStart(5, '0');

    // Auto calc retirement date (60 years from DOB)
    const dob = new Date(b.dob);
    const dor = new Date(dob);
    dor.setFullYear(dor.getFullYear() + 60);

    const result = await query(
      `INSERT INTO employees(emp_id,first_name,last_name,father_name,mother_name,gender,dob,dor,mobile,alternate_mobile,
        official_email,personal_email,aadhaar_number,pan_number,voter_id,dept_id,designation_id,grade,pay_level,pay_step,
        basic_pay,category,religion,caste,is_divyang,divyang_type,divyang_percentage,district,posting_station,
        present_address,permanent_address,blood_group,qualification,subject_specialization,experience_years,doj,
        account_number,bank_name,ifsc_code,bank_branch,pf_number,nps_id,nominee_name,nominee_relation,nominee_dob,
        emergency_contact_name,emergency_contact_mobile,status,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,
              $28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49)
       RETURNING *`,
      [emp_id, b.first_name, b.last_name, b.father_name||null, b.mother_name||null, b.gender, b.dob, dor.toISOString().split('T')[0],
       b.mobile, b.alternate_mobile||null, b.official_email||null, b.personal_email||null, b.aadhaar_number||null,
       b.pan_number||null, b.voter_id||null, b.dept_id, b.designation_id||null, b.grade||null, b.pay_level||null,
       b.pay_step||1, b.basic_pay||null, b.category||'General', b.religion||null, b.caste||null,
       b.is_divyang||false, b.divyang_type||null, b.divyang_percentage||null, b.district||null, b.posting_station||null,
       b.present_address||null, b.permanent_address||null, b.blood_group||null, b.qualification||null,
       b.subject_specialization||null, b.experience_years||0, b.doj, b.account_number||null, b.bank_name||null,
       b.ifsc_code||null, b.bank_branch||null, b.pf_number||null, b.nps_id||null, b.nominee_name||null,
       b.nominee_relation||null, b.nominee_dob||null, b.emergency_contact_name||null, b.emergency_contact_mobile||null,
       b.status||'Active', req.user.id]
    );
    // Create leave balance for current year
    const yr = new Date().getFullYear();
    await query('INSERT INTO leave_balances(emp_id,year) VALUES($1,$2) ON CONFLICT DO NOTHING', [emp_id, yr]);
    // Auto create service book joining entry
    await query(
      `INSERT INTO service_book_entries(emp_id,event_date,event_type,details,recorded_by,recorded_by_name,is_verified)
       VALUES($1,$2,'Joining',$3,$4,$5,true)`,
      [emp_id, b.doj, `Joined as ${b.designation_name||'Employee'} at ${b.posting_station||''}`, req.user.id, req.user.username]
    );
    // Retirement tracking
    await query('INSERT INTO retirement_tracking(emp_id,retirement_date) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [emp_id, dor.toISOString().split('T')[0]]);
    return success(res, result.rows[0], 'Employee created successfully', 201);
  } catch (err) {
    if (err.code === '23505') return error(res, 'Employee already exists.', 409);
    return error(res, err.message);
  }
};

exports.update = async (req, res) => {
  const b = req.body;
  const { empId } = req.params;
  try {
    const result = await query(
      `UPDATE employees SET
        first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
        father_name=COALESCE($3,father_name), mobile=COALESCE($4,mobile),
        alternate_mobile=COALESCE($5,alternate_mobile), official_email=COALESCE($6,official_email),
        personal_email=COALESCE($7,personal_email), dept_id=COALESCE($8,dept_id),
        designation_id=COALESCE($9,designation_id), grade=COALESCE($10,grade),
        pay_level=COALESCE($11,pay_level), basic_pay=COALESCE($12,basic_pay),
        category=COALESCE($13,category), district=COALESCE($14,district),
        posting_station=COALESCE($15,posting_station), blood_group=COALESCE($16,blood_group),
        qualification=COALESCE($17,qualification), bank_name=COALESCE($18,bank_name),
        account_number=COALESCE($19,account_number), ifsc_code=COALESCE($20,ifsc_code),
        pf_number=COALESCE($21,pf_number), nominee_name=COALESCE($22,nominee_name),
        status=COALESCE($23,status), updated_by=$24, updated_at=NOW()
       WHERE emp_id=$25 RETURNING *`,
      [b.first_name, b.last_name, b.father_name, b.mobile, b.alternate_mobile, b.official_email, b.personal_email,
       b.dept_id, b.designation_id, b.grade, b.pay_level, b.basic_pay, b.category, b.district, b.posting_station,
       b.blood_group, b.qualification, b.bank_name, b.account_number, b.ifsc_code, b.pf_number, b.nominee_name,
       b.status, req.user.id, empId]
    );
    if (!result.rows.length) return error(res, 'Employee not found.', 404);
    return success(res, result.rows[0], 'Updated successfully');
  } catch (err) { return error(res, err.message); }
};

exports.myProfile = async (req, res) => {
  try {
    const result = await query(`${empSelect} WHERE e.emp_id = $1`, [req.user.emp_id]);
    if (!result.rows.length) return error(res, 'Profile not found.', 404);
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};