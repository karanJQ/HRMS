const { query } = require('../config/database');
const { success, error } = require('../utils/response');

const empSelect = `
  SELECT e.*,
    d.name as dept_name, d.code as dept_code,
    des.name as designation_name, des.grade as designation_grade,
    rm.first_name || ' ' || rm.last_name as reporting_manager_name
  FROM employees e
  LEFT JOIN departments d ON d.id = e.dept_id
  LEFT JOIN designations des ON des.id = e.designation_id
  LEFT JOIN employees rm ON rm.emp_id = e.reporting_manager_id
`;

exports.list = async (req, res) => {
  const { dept, status, category, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [], params = [];
  let idx = 1;

  if (dept) { conditions.push(`e.dept_id = $${idx++}`); params.push(dept); }
  if (status === 'On Probation') { 
    conditions.push(`e.probation_status = 'Pending' AND e.status = 'Active'`); 
  } else if (status) { 
    conditions.push(`e.status = $${idx++}`); params.push(status); 
  }
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

    // Auto calc probation end date
    const probDays = b.probation_days !== undefined ? parseInt(b.probation_days) : 90;
    let probEndDate = null;
    let probStatus = 'Pending';
    if (probDays > 0 && b.doj) {
      const d = new Date(b.doj);
      d.setDate(d.getDate() + probDays);
      probEndDate = d.toISOString().split('T')[0];
    } else if (probDays === 0) {
      probStatus = 'Accepted';
    }

    const result = await query(
      `INSERT INTO employees(emp_id,first_name,last_name,father_name,mother_name,gender,dob,dor,mobile,alternate_mobile,
        official_email,personal_email,aadhaar_number,pan_number,voter_id,dept_id,designation_id,grade,pay_level,pay_step,
        basic_pay,ctc,category,religion,caste,is_divyang,divyang_type,divyang_percentage,district,posting_station,
        present_address,permanent_address,blood_group,qualification,subject_specialization,experience_years,doj,
        account_number,bank_name,ifsc_code,bank_branch,pf_number,nps_id,nominee_name,nominee_relation,nominee_dob,
        emergency_contact_name,emergency_contact_mobile,status,created_by,
        probation_days,probation_end_date,probation_status,uan_number,esic_number,reporting_manager_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$50,$22,$23,$24,$25,$26,$27,
              $28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,
              $51,$52,$53,$54,$55,$56)
       RETURNING *`,
      [emp_id, b.first_name, b.last_name || '', b.father_name||null, b.mother_name||null, b.gender, b.dob, dor.toISOString().split('T')[0],
       b.mobile, b.alternate_mobile||null, b.official_email||null, b.personal_email||null, b.aadhaar_number||null,
       b.pan_number||null, b.voter_id||null, b.dept_id, b.designation_id||null, b.grade||null, b.pay_level||null,
       b.pay_step||1, b.basic_pay||null, b.category||'General', b.religion||null, b.caste||null,
       b.is_divyang||false, b.divyang_type||null, b.divyang_percentage||null, b.district||null, b.posting_station||null,
       b.present_address||null, b.permanent_address||null, b.blood_group||null, b.qualification||null,
       b.subject_specialization||null, b.experience_years||0, b.doj, b.account_number||null, b.bank_name||null,
       b.ifsc_code||null, b.bank_branch||null, b.pf_number||null, b.nps_id||null, b.nominee_name||null,
       b.nominee_relation||null, b.nominee_dob||null, b.emergency_contact_name||null, b.emergency_contact_mobile||null,
       b.status||'Active', req.user.id, b.ctc||null, probDays, probEndDate, probStatus, b.uan_number||null, b.esic_number||null,
       b.reporting_manager_id||null]
    );
    // Create leave balance for current year
    const yr = new Date().getFullYear();
    await query('INSERT INTO leave_balances(emp_id, year, cl_entitled, el_entitled, ml_entitled, ccl_entitled, sl_entitled) VALUES($1, $2, 0, 0, 0, 0, 0) ON CONFLICT DO NOTHING', [emp_id, yr]);
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
    const empRes = await query('SELECT doj, probation_days, probation_status, probation_end_date FROM employees WHERE emp_id = $1', [empId]);
    if (!empRes.rows.length) return error(res, 'Employee not found.', 404);
    
    const curr = empRes.rows[0];
    const newDoj = b.doj || curr.doj;
    const newProbDays = b.probation_days !== undefined ? parseInt(b.probation_days) : curr.probation_days;
    
    let probEndDate = b.probation_end_date || curr.probation_end_date;
    let probStatus = b.probation_status || curr.probation_status;
    
    if (newProbDays > 0 && newDoj) {
      const d = new Date(newDoj);
      d.setDate(d.getDate() + newProbDays);
      probEndDate = d.toISOString().split('T')[0];
    } else if (newProbDays === 0) {
      probEndDate = null;
      probStatus = 'Accepted';
    }

    const result = await query(
      `UPDATE employees SET
        first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
        father_name=COALESCE($3,father_name), mother_name=COALESCE($4,mother_name),
        gender=COALESCE($5,gender), dob=COALESCE(NULLIF($6,'')::date,dob),
        mobile=COALESCE($7,mobile), alternate_mobile=COALESCE($8,alternate_mobile),
        official_email=COALESCE($9,official_email), personal_email=COALESCE($10,personal_email),
        aadhaar_number=COALESCE($11,aadhaar_number), pan_number=COALESCE($12,pan_number),
        voter_id=COALESCE($13,voter_id), dept_id=COALESCE($14,dept_id),
        designation_id=COALESCE($15,designation_id), grade=COALESCE($16,grade),
        pay_level=COALESCE($17,pay_level), pay_step=COALESCE($18,pay_step),
        basic_pay=COALESCE($19,basic_pay), category=COALESCE($20,category),
        religion=COALESCE($21,religion), caste=COALESCE($22,caste),
        district=COALESCE($23,district), posting_station=COALESCE($24,posting_station),
        present_address=COALESCE($25,present_address), permanent_address=COALESCE($26,permanent_address),
        blood_group=COALESCE($27,blood_group), qualification=COALESCE($28,qualification),
        subject_specialization=COALESCE($29,subject_specialization),
        experience_years=COALESCE($30,experience_years), doj=COALESCE(NULLIF($31,'')::date,doj),
        account_number=COALESCE($32,account_number), bank_name=COALESCE($33,bank_name),
        ifsc_code=COALESCE($34,ifsc_code), bank_branch=COALESCE($35,bank_branch),
        pf_number=COALESCE($36,pf_number), nps_id=COALESCE($37,nps_id),
        nominee_name=COALESCE($38,nominee_name), nominee_relation=COALESCE($39,nominee_relation),
        nominee_dob=COALESCE(NULLIF($40,'')::date,nominee_dob),
        emergency_contact_name=COALESCE($41,emergency_contact_name),
        emergency_contact_mobile=COALESCE($42,emergency_contact_mobile),
        status=COALESCE($43,status), ctc=COALESCE($46,ctc),
        probation_days=$47,
        probation_end_date=NULLIF($48,'')::date,
        probation_status=$49,
        uan_number=COALESCE($50,uan_number),
        esic_number=COALESCE($51,esic_number),
        reporting_manager_id=COALESCE($52,reporting_manager_id),
        updated_by=$44, updated_at=NOW()
       WHERE emp_id=$45 RETURNING *`,
      [b.first_name, b.last_name, b.father_name, b.mother_name, b.gender, b.dob,
       b.mobile, b.alternate_mobile, b.official_email, b.personal_email,
       b.aadhaar_number, b.pan_number, b.voter_id, b.dept_id, b.designation_id,
       b.grade, b.pay_level, b.pay_step, b.basic_pay, b.category,
       b.religion, b.caste, b.district, b.posting_station,
       b.present_address, b.permanent_address, b.blood_group, b.qualification,
       b.subject_specialization, b.experience_years, b.doj,
       b.account_number, b.bank_name, b.ifsc_code, b.bank_branch,
       b.pf_number, b.nps_id, b.nominee_name, b.nominee_relation, b.nominee_dob,
       b.emergency_contact_name, b.emergency_contact_mobile,
       b.status, req.user.id, empId, b.ctc,
       newProbDays, probEndDate, probStatus, b.uan_number||null, b.esic_number||null, b.reporting_manager_id||null]
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

exports.getBirthdays = async (req, res) => {
  const { month } = req.query;
  const m = parseInt(month) || new Date().getMonth() + 1;
  try {
    const result = await query(
      `SELECT e.emp_id, e.first_name, e.last_name, e.dob, e.designation_id,
              d.name as dept_name, des.name as designation_name
       FROM employees e
       JOIN departments d ON d.id = e.dept_id
       LEFT JOIN designations des ON des.id = e.designation_id
       WHERE EXTRACT(MONTH FROM e.dob) = $1 AND e.status = 'Active'
       ORDER BY EXTRACT(DAY FROM e.dob)`,
      [m]
    );
    const data = result.rows.map(r => ({
      ...r,
      day: new Date(r.dob).getDate(),
      date: new Date(new Date().getFullYear(), m - 1, new Date(r.dob).getDate())
    }));
    return success(res, data, 'Birthdays fetched');
  } catch (err) { return error(res, err.message); }
};

exports.getAnniversaries = async (req, res) => {
  const { month } = req.query;
  const m = parseInt(month) || new Date().getMonth() + 1;
  try {
    const result = await query(
      `SELECT e.emp_id, e.first_name, e.last_name, e.doj, e.designation_id,
              d.name as dept_name, des.name as designation_name,
              EXTRACT(YEAR FROM AGE(NOW(), e.doj)) as years_completed
       FROM employees e
       JOIN departments d ON d.id = e.dept_id
       LEFT JOIN designations des ON des.id = e.designation_id
       WHERE EXTRACT(MONTH FROM e.doj) = $1 AND e.status = 'Active'
       ORDER BY EXTRACT(DAY FROM e.doj)`,
      [m]
    );
    return success(res, result.rows, 'Anniversaries fetched');
  } catch (err) { return error(res, err.message); }
};

exports.handleProbationAction = async (req, res) => {
  const { action, days, notes } = req.body;
  const { empId } = req.params;
  
  try {
    const empRes = await query('SELECT emp_id, probation_end_date, probation_days FROM employees WHERE emp_id = $1', [empId]);
    if (!empRes.rows.length) return error(res, 'Employee not found', 404);
    
    const emp = empRes.rows[0];
    
    // Log review in audit trail
    await query(
      `INSERT INTO probation_reviews(emp_id, action, extension_days, notes, reviewed_by)
       VALUES($1, $2, $3, $4, $5)`,
      [empId, action, days || 0, notes || '', req.user.id]
    );
    
    if (action === 'accept') {
      await query(`UPDATE employees SET probation_status = 'Accepted' WHERE emp_id = $1`, [empId]);
    } 
    else if (action === 'reject') {
      await query(`UPDATE employees SET probation_status = 'Rejected', status = 'Inactive' WHERE emp_id = $1`, [empId]);
    } 
    else if (action === 'extend') {
      const extDays = parseInt(days) || 0;
      if (extDays <= 0) return error(res, 'Invalid extension days', 400);
      
      const currentEnd = new Date(emp.probation_end_date);
      currentEnd.setDate(currentEnd.getDate() + extDays);
      const newEndStr = currentEnd.toISOString().split('T')[0];
      const newTotalDays = (parseInt(emp.probation_days) || 0) + extDays;
      
      await query(
        `UPDATE employees SET probation_end_date = $1, probation_days = $2 WHERE emp_id = $3`,
        [newEndStr, newTotalDays, empId]
      );
    } 
    else {
      return error(res, 'Invalid action', 400);
    }
    
    return success(res, null, 'Probation action processed successfully');
  } catch (err) {
    return error(res, err.message);
  }
};
