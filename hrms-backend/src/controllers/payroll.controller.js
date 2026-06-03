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
          professional_tax=200, tds=0, other_deductions=0, lwp_days=0, payment_mode='Bank Transfer', status='Processed' } = req.body;
  
  const ctc = parseFloat(rawCtc || fallbackCtc || 0);
  if (!emp_id||!month||!year||!ctc) return error(res,'emp_id, month, year, and ctc required.',400);

  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [emp_id]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${emp_id}' does not exist.`, 404);
    }

    const gross = ctc; // the input field is re-purposed as Monthly Gross Salary
    const basic = Math.round(gross / 2);
    const hra = Math.round(basic * 0.40);
    const conveyance = Math.round(basic * 0.60);

    const pf_er = Math.round(Math.min(basic * 0.13, 1950));
    const pf_emp = basic > 14999 ? 1800 : Math.round(basic * 0.12);
    
    // ESIC applies only if Basic <= 21000, calculated on Basic
    const esic_emp = basic > 21000 ? 0 : Math.round(basic * 0.0075);
    const esic_er = basic > 21000 ? 0 : Math.round(basic * 0.0325);

    const pt = 200;
    const total_ded = pf_emp + esic_emp + pt + parseFloat(tds) + parseFloat(other_deductions);
    
    // Calculate initial Net
    let net = gross - total_ded;
    
    // Auto-LWP from Leave Balances
    let auto_lwp_days = 0;
    const lbRes = await query('SELECT * FROM leave_balances WHERE emp_id=$1 AND year=$2', [emp_id, year]);
    if (lbRes.rows.length > 0) {
       const lb = lbRes.rows[0];
       const types = ['cl', 'el', 'ml', 'ccl', 'sl', 'dl'];
       let toUpdate = [];
       for (let t of types) {
           const entitled = parseFloat(lb[`${t}_entitled`] || 0);
           const used = parseFloat(lb[`${t}_used`] || 0);
           if (used > entitled) {
               auto_lwp_days += (used - entitled);
               toUpdate.push(`${t}_entitled = ${used}`);
           }
       }
       if (toUpdate.length > 0) {
           await query(`UPDATE leave_balances SET ${toUpdate.join(', ')}, updated_at=NOW() WHERE id=$1`, [lb.id]);
       }
    }
    
    const final_lwp_days = parseFloat(lwp_days || 0) + auto_lwp_days;
    
    // LWP Calculation
    const daysInMonth = new Date(year, month, 0).getDate();
    const lwp_amount = Math.round((net / daysInMonth) * final_lwp_days);
    
    // Final Net after LWP
    net = net - lwp_amount;
    const final_total_ded = total_ded + lwp_amount; // LWP is part of deductions

    const real_ctc = gross + pf_er; // User's formula: CTC = Gross salary + Employer PF

    const result = await query(
      `INSERT INTO payroll_records(emp_id,month,year,ctc,basic_pay,hra_amount,ta_amount,
        gross_pay,pf_employee,esic_employee,pf_employer,esic_employer,professional_tax,tds,
        other_deductions,lwp_days,lwp_amount,total_deductions,net_pay,payment_mode,status,processed_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       ON CONFLICT(emp_id,month,year) DO UPDATE SET
         ctc=EXCLUDED.ctc, basic_pay=EXCLUDED.basic_pay, hra_amount=EXCLUDED.hra_amount,
         ta_amount=EXCLUDED.ta_amount, gross_pay=EXCLUDED.gross_pay,
         pf_employee=EXCLUDED.pf_employee, esic_employee=EXCLUDED.esic_employee,
         pf_employer=EXCLUDED.pf_employer, esic_employer=EXCLUDED.esic_employer,
         professional_tax=EXCLUDED.professional_tax, tds=EXCLUDED.tds,
         other_deductions=EXCLUDED.other_deductions, lwp_days=EXCLUDED.lwp_days, lwp_amount=EXCLUDED.lwp_amount, 
         total_deductions=EXCLUDED.total_deductions,
         net_pay=EXCLUDED.net_pay, payment_mode=EXCLUDED.payment_mode, status=EXCLUDED.status,
         processed_by=EXCLUDED.processed_by, updated_at=NOW()
       RETURNING *`,
      [emp_id, month, year, real_ctc, basic, hra, conveyance, gross, pf_emp, esic_emp, pf_er, esic_er,
       pt, tds, other_deductions, final_lwp_days, lwp_amount, final_total_ded, net, payment_mode, status, req.user.id]
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

      const gross = ctc; // Input is treated as Gross Salary
      const basic = Math.round(gross / 2);
      const hra = Math.round(basic * 0.40);
      const conveyance = Math.round(basic * 0.60);

      const pf_er = Math.round(Math.min(basic * 0.13, 1950));
      const pf_emp = basic > 14999 ? 1800 : Math.round(basic * 0.12);

      const esic_emp = basic > 21000 ? 0 : Math.round(basic * 0.0075);
      const esic_er = basic > 21000 ? 0 : Math.round(basic * 0.0325);
      
      const pt = 200;
      const tds_val = gross > 50000 ? Math.round((gross - 50000) * 0.1) : 0;
      
      const total_ded = pf_emp + esic_emp + pt + tds_val;
      let net = gross - total_ded;

      let auto_lwp_days = 0;
      const lbRes = await query('SELECT * FROM leave_balances WHERE emp_id=$1 AND year=$2', [e.emp_id, year]);
      if (lbRes.rows.length > 0) {
         const lb = lbRes.rows[0];
         const types = ['cl', 'el', 'ml', 'ccl', 'sl', 'dl'];
         let toUpdate = [];
         for (let t of types) {
             const entitled = parseFloat(lb[`${t}_entitled`] || 0);
             const used = parseFloat(lb[`${t}_used`] || 0);
             if (used > entitled) {
                 auto_lwp_days += (used - entitled);
                 toUpdate.push(`${t}_entitled = ${used}`);
             }
         }
         if (toUpdate.length > 0) {
             await query(`UPDATE leave_balances SET ${toUpdate.join(', ')}, updated_at=NOW() WHERE id=$1`, [lb.id]);
         }
      }

      // Calculate LWP for processAll
      const final_lwp_days = auto_lwp_days;
      const daysInMonth = new Date(year, month, 0).getDate();
      const lwp_amount = Math.round((net / daysInMonth) * final_lwp_days);
      
      net = net - lwp_amount;
      const final_total_ded = total_ded + lwp_amount;

      const real_ctc = gross + pf_er;

      await query(
        `INSERT INTO payroll_records(emp_id,month,year,ctc,basic_pay,hra_amount,ta_amount,
          gross_pay,pf_employee,esic_employee,pf_employer,esic_employer,professional_tax,tds,
          other_deductions,lwp_days,lwp_amount,total_deductions,net_pay,status,processed_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'Processed',$20)
         ON CONFLICT(emp_id,month,year) DO UPDATE SET
           ctc=EXCLUDED.ctc, basic_pay=EXCLUDED.basic_pay, hra_amount=EXCLUDED.hra_amount,
           ta_amount=EXCLUDED.ta_amount, gross_pay=EXCLUDED.gross_pay,
           pf_employee=EXCLUDED.pf_employee, esic_employee=EXCLUDED.esic_employee,
           pf_employer=EXCLUDED.pf_employer, esic_employer=EXCLUDED.esic_employer,
           professional_tax=EXCLUDED.professional_tax, tds=EXCLUDED.tds,
           other_deductions=EXCLUDED.other_deductions, lwp_days=EXCLUDED.lwp_days, lwp_amount=EXCLUDED.lwp_amount,
           total_deductions=EXCLUDED.total_deductions, net_pay=EXCLUDED.net_pay,
           status='Processed', updated_at=NOW()`,
        [e.emp_id, month, year, real_ctc, basic, hra, conveyance, gross, pf_emp, esic_emp, pf_er, esic_er, pt, tds_val, 0, final_lwp_days, lwp_amount, final_total_ded, net, req.user.id]
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