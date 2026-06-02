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
  const { emp_id, month, year, ctc: rawCtc, basic_pay: fallbackCtc,
          professional_tax=200, tds=0, other_deductions=0, payment_mode='Bank Transfer', status='Processed' } = req.body;
  
  const ctc = parseFloat(rawCtc || fallbackCtc || 0);
  if (!emp_id||!month||!year||!ctc) return error(res,'emp_id, month, year, and ctc required.',400);

  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [emp_id]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${emp_id}' does not exist.`, 404);
    }

    let gross = 0;
    if (ctc / 1.08125 >= 30000) {
      gross = Math.round((ctc - 1950) / 1.01625);
    } else {
      gross = Math.round(ctc / 1.08125);
    }

    const basic = Math.round(gross * 0.5);
    const hra = Math.round(basic * 0.4);
    const conveyance = gross - basic - hra;

    const pf_wage = Math.min(basic, 15000);
    const pf_er = Math.round(0.13 * pf_wage);
    const esic_er = Math.round(0.0325 * basic);

    const pf_emp = Math.round(0.12 * pf_wage);
    const esic_emp = Math.round(0.0075 * basic);

    const total_ded = pf_emp + esic_emp + parseFloat(professional_tax) + parseFloat(tds) + parseFloat(other_deductions);
    const net = gross - total_ded;

    const result = await query(
      `INSERT INTO payroll_records(emp_id,month,year,ctc,basic_pay,hra_amount,ta_amount,
        gross_pay,pf_employee,esic_employee,pf_employer,esic_employer,professional_tax,tds,
        other_deductions,total_deductions,net_pay,payment_mode,status,processed_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT(emp_id,month,year) DO UPDATE SET
         ctc=EXCLUDED.ctc, basic_pay=EXCLUDED.basic_pay, hra_amount=EXCLUDED.hra_amount,
         ta_amount=EXCLUDED.ta_amount, gross_pay=EXCLUDED.gross_pay,
         pf_employee=EXCLUDED.pf_employee, esic_employee=EXCLUDED.esic_employee,
         pf_employer=EXCLUDED.pf_employer, esic_employer=EXCLUDED.esic_employer,
         professional_tax=EXCLUDED.professional_tax, tds=EXCLUDED.tds,
         other_deductions=EXCLUDED.other_deductions, total_deductions=EXCLUDED.total_deductions,
         net_pay=EXCLUDED.net_pay, payment_mode=EXCLUDED.payment_mode, status=EXCLUDED.status,
         processed_by=EXCLUDED.processed_by, updated_at=NOW()
       RETURNING *`,
      [emp_id, month, year, ctc, basic, hra, conveyance, gross, pf_emp, esic_emp, pf_er, esic_er,
       professional_tax, tds, other_deductions, total_ded, net, payment_mode, status, req.user.id]
    );
    return success(res, result.rows[0], 'Payroll processed');
  } catch (err) { return error(res, err.message); }
};

exports.processAll = async (req, res) => {
  const { month, year } = req.body;
  if (!month||!year) return error(res,'month and year required.',400);
  try {
    const emps = await query(`SELECT emp_id, ctc, basic_pay FROM employees WHERE status='Active' AND (ctc > 0 OR basic_pay > 0)`);
    let processed = 0;
    for (const e of emps.rows) {
      const ctc = parseFloat(e.ctc || e.basic_pay || 0);
      if (!ctc) continue;

      let gross = 0;
      if (ctc / 1.08125 >= 30000) {
        gross = Math.round((ctc - 1950) / 1.01625);
      } else {
        gross = Math.round(ctc / 1.08125);
      }

      const basic = Math.round(gross * 0.5);
      const hra = Math.round(basic * 0.4);
      const conveyance = gross - basic - hra;

      const pf_wage = Math.min(basic, 15000);
      const pf_er = Math.round(0.13 * pf_wage);
      const esic_er = Math.round(0.0325 * basic);

      const pf_emp = Math.round(0.12 * pf_wage);
      const esic_emp = Math.round(0.0075 * basic);
      const pt = 200;
      const tds = gross > 50000 ? Math.round((gross - 50000) * 0.1) : 0;
      
      const total_ded = pf_emp + esic_emp + pt + tds;
      const net = gross - total_ded;

      await query(
        `INSERT INTO payroll_records(emp_id,month,year,ctc,basic_pay,hra_amount,ta_amount,
          gross_pay,pf_employee,esic_employee,pf_employer,esic_employer,professional_tax,tds,
          total_deductions,net_pay,status,processed_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'Processed',$17)
         ON CONFLICT(emp_id,month,year) DO UPDATE SET
           ctc=EXCLUDED.ctc, basic_pay=EXCLUDED.basic_pay, hra_amount=EXCLUDED.hra_amount,
           ta_amount=EXCLUDED.ta_amount, gross_pay=EXCLUDED.gross_pay,
           pf_employee=EXCLUDED.pf_employee, esic_employee=EXCLUDED.esic_employee,
           pf_employer=EXCLUDED.pf_employer, esic_employer=EXCLUDED.esic_employer,
           professional_tax=EXCLUDED.professional_tax, tds=EXCLUDED.tds,
           total_deductions=EXCLUDED.total_deductions, net_pay=EXCLUDED.net_pay,
           status='Processed', updated_at=NOW()`,
        [e.emp_id, month, year, ctc, basic, hra, conveyance, gross, pf_emp, esic_emp, pf_er, esic_er, pt, tds, total_ded, net, req.user.id]
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