const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  const { month, year, dept, status } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const conditions = ['pr.year=$1'];
  const params = [y];
  let idx = 2;
  let m = month === 'all' ? 'all' : (parseInt(month) || new Date().getMonth() + 1);

  if (month !== 'all') {
    conditions.push(`pr.month=$${idx++}`);
    params.push(m);
  }

  if (dept) { conditions.push(`e.dept_id=$${idx++}`); params.push(dept); }
  if (status) { conditions.push(`pr.status=$${idx++}`); params.push(status); }
  if (req.user.role === 'dept_head') { conditions.push(`e.dept_id=$${idx++}`); params.push(req.user.dept_id); }
  if (req.user.role === 'employee') { conditions.push(`pr.emp_id=$${idx++}`); params.push(req.user.emp_id); }
  try {
    const result = await query(
      `SELECT pr.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name
       FROM payroll_records pr
       JOIN employees e ON e.emp_id=pr.emp_id
       JOIN departments d ON d.id=e.dept_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.first_name`, params
    );
    const summary = result.rows.reduce((acc, r) => ({
      gross: acc.gross + parseFloat(r.gross_pay||0),
      net: acc.net + parseFloat(r.net_pay||0),
      pf: acc.pf + parseFloat(r.pf_employee||0),
      tds: acc.tds + parseFloat(r.tds||0),
    }), { gross:0, net:0, pf:0, tds:0 });
    return success(res, { records: result.rows, summary, month: m, year: y });
  } catch (err) { return error(res, err.message); }
};

exports.getSlip = async (req, res) => {
  const { empId, month, year } = req.params;
  if (req.user.role === 'employee' && req.user.emp_id !== empId)
    return error(res, 'Access denied.', 403);
  try {
    const result = await query(
      `SELECT pr.*, e.first_name||' '||e.last_name as emp_name, e.designation_id,
              des.name as designation_name, d.name as dept_name, e.bank_name, e.account_number,
              e.pf_number, e.pay_level, e.grade
       FROM payroll_records pr
       JOIN employees e ON e.emp_id=pr.emp_id
       JOIN departments d ON d.id=e.dept_id
       LEFT JOIN designations des ON des.id=e.designation_id
       WHERE pr.emp_id=$1 AND pr.month=$2 AND pr.year=$3`, [empId, month, year]
    );
    if (!result.rows.length) return error(res, 'Payroll record not found.', 404);
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

exports.process = async (req, res) => {
  const { emp_id, month, year, basic_pay, da_percentage=42, hra_percentage=20, ta_amount=1500,
          medical_allowance=0, special_allowance=0, other_allowances=0,
          professional_tax=200, tds=0, other_deductions=0, payment_mode='Bank Transfer' } = req.body;
  if (!emp_id||!month||!year||!basic_pay) return error(res,'emp_id, month, year, basic_pay required.',400);
  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [emp_id]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${emp_id}' does not exist.`, 404);
    }
    const da = Math.round(basic_pay * da_percentage / 100);
    const hra = Math.round(basic_pay * hra_percentage / 100);
    const gross = parseFloat(basic_pay)+da+hra+parseFloat(ta_amount)+parseFloat(medical_allowance)+parseFloat(special_allowance)+parseFloat(other_allowances);
    const pf_emp = Math.round(basic_pay * 0.12);
    const pf_er = Math.round(basic_pay * 0.12);
    const total_ded = pf_emp + parseFloat(professional_tax) + parseFloat(tds) + parseFloat(other_deductions);
    const net = gross - total_ded;
    const result = await query(
      `INSERT INTO payroll_records(emp_id,month,year,basic_pay,da_percentage,da_amount,hra_percentage,hra_amount,
        ta_amount,medical_allowance,special_allowance,other_allowances,gross_pay,pf_employee,pf_employer,
        professional_tax,tds,other_deductions,total_deductions,net_pay,payment_mode,status,processed_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'Processed',$22)
       ON CONFLICT(emp_id,month,year) DO UPDATE SET
         basic_pay=EXCLUDED.basic_pay, da_amount=EXCLUDED.da_amount, hra_amount=EXCLUDED.hra_amount,
         gross_pay=EXCLUDED.gross_pay, net_pay=EXCLUDED.net_pay, status='Processed',
         processed_by=EXCLUDED.processed_by, updated_at=NOW()
       RETURNING *`,
      [emp_id,month,year,basic_pay,da_percentage,da,hra_percentage,hra,ta_amount,medical_allowance,
       special_allowance,other_allowances,gross,pf_emp,pf_er,professional_tax,tds,other_deductions,total_ded,net,payment_mode,req.user.id]
    );
    return success(res, result.rows[0], 'Payroll processed');
  } catch (err) { return error(res, err.message); }
};

exports.processAll = async (req, res) => {
  const { month, year } = req.body;
  if (!month||!year) return error(res,'month and year required.',400);
  try {
    const emps = await query(`SELECT emp_id, basic_pay FROM employees WHERE status='Active' AND basic_pay IS NOT NULL`);
    let processed = 0;
    for (const e of emps.rows) {
      const bp = parseFloat(e.basic_pay);
      const da = Math.round(bp*42/100); const hra = Math.round(bp*20/100);
      const ta = 1500; const gross = bp+da+hra+ta;
      const pf = Math.round(bp*0.12); const pt = 200;
      const tds = gross>50000?Math.round((gross-50000)*0.1):0;
      const total_ded = pf+pt+tds; const net = gross-total_ded;
      await query(
        `INSERT INTO payroll_records(emp_id,month,year,basic_pay,da_percentage,da_amount,hra_percentage,hra_amount,
          ta_amount,gross_pay,pf_employee,pf_employer,professional_tax,tds,total_deductions,net_pay,status,processed_by)
         VALUES($1,$2,$3,$4,42,$5,20,$6,1500,$7,$8,$8,200,$9,$10,$11,'Processed',$12)
         ON CONFLICT(emp_id,month,year) DO UPDATE SET status='Processed', updated_at=NOW()`,
        [e.emp_id,month,year,bp,da,hra,gross,pf,tds,total_ded,net,req.user.id]
      );
      processed++;
    }
    return success(res, { processed }, `${processed} payroll records processed`);
  } catch (err) { return error(res, err.message); }
};

exports.markPaid = async (req, res) => {
  const { month, year } = req.body;
  try {
    const result = await query(
      `UPDATE payroll_records SET status='Paid', payment_date=CURRENT_DATE, updated_at=NOW()
       WHERE month=$1 AND year=$2 AND status='Processed'`,
      [month, year]
    );
    return success(res, null, `Marked ${result.rowCount || 0} payroll records as Paid`);
  } catch (err) { return error(res, err.message); }
};