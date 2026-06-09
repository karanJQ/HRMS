const { query } = require('../config/database');
const { success, error } = require('../utils/response');

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return null;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

const determineDailySessionStatuses = (row, shift, todayStr) => {
  const dateStr = row.date;
  const isWeekend = new Date(dateStr + 'T00:00:00').getDay() === 0 || new Date(dateStr + 'T00:00:00').getDay() === 6;
  const isFuture = dateStr > todayStr;
  const leaveHalfDayType = row.half_day_type || row.leave_half_day_type;
  const wfhHalfDay = row.wfh_half_day_type;

  let firstHalf = 'Absent';
  if (row.is_holiday) {
    firstHalf = 'Holiday';
  } else if (isFuture) {
    if (row.leave_status === 'Approved' && (leaveHalfDayType === 'FIRST_HALF' || !leaveHalfDayType)) {
      firstHalf = row.leave_type === 'WFH' ? 'WFH' : 'Leave';
    } else if (row.wfh_status === 'Approved' && (wfhHalfDay === 'FIRST_HALF' || !wfhHalfDay)) {
      firstHalf = 'WFH';
    } else {
      firstHalf = 'Upcoming';
    }
  } else {
    if (row.leave_status === 'Approved' && (leaveHalfDayType === 'FIRST_HALF' || !leaveHalfDayType)) {
      firstHalf = row.leave_type === 'WFH' ? 'WFH' : 'Leave';
    } else if (row.wfh_status === 'Approved' && (wfhHalfDay === 'FIRST_HALF' || !wfhHalfDay)) {
      firstHalf = 'WFH';
    } else if (row.punch_in) {
      const inMin = timeToMinutes(row.punch_in);
      const outMin = timeToMinutes(row.punch_out);
      const cutoffMin = timeToMinutes(shift.half_day_cutoff || '14:00:00');
      const startMin = timeToMinutes(shift.shift_start || '09:00:00');
      const graceMins = parseInt(shift.grace_period_mins || 30, 10);

      if (inMin !== null && inMin < cutoffMin) {
        if (outMin !== null) {
          if (outMin >= cutoffMin) {
            firstHalf = (inMin > startMin + graceMins) ? 'Late' : 'Present';
          } else {
            firstHalf = 'Absent';
          }
        } else {
          if (dateStr === todayStr) {
            firstHalf = (inMin > startMin + graceMins) ? 'Late' : 'Present';
          } else {
            firstHalf = 'Miss Punch';
          }
        }
      } else {
        firstHalf = 'Absent';
      }
    } else if (isWeekend) {
      firstHalf = 'Weekend';
    }
  }

  let secondHalf = 'Absent';
  if (row.is_holiday) {
    secondHalf = 'Holiday';
  } else if (isFuture) {
    if (row.leave_status === 'Approved' && (leaveHalfDayType === 'SECOND_HALF' || !leaveHalfDayType)) {
      secondHalf = row.leave_type === 'WFH' ? 'WFH' : 'Leave';
    } else if (row.wfh_status === 'Approved' && (wfhHalfDay === 'SECOND_HALF' || !wfhHalfDay)) {
      secondHalf = 'WFH';
    } else {
      secondHalf = 'Upcoming';
    }
  } else {
    if (row.leave_status === 'Approved' && (leaveHalfDayType === 'SECOND_HALF' || !leaveHalfDayType)) {
      secondHalf = row.leave_type === 'WFH' ? 'WFH' : 'Leave';
    } else if (row.wfh_status === 'Approved' && (wfhHalfDay === 'SECOND_HALF' || !wfhHalfDay)) {
      secondHalf = 'WFH';
    } else if (row.punch_in) {
      const inMin = timeToMinutes(row.punch_in);
      const outMin = timeToMinutes(row.punch_out);
      const cutoffMin = timeToMinutes(shift.half_day_cutoff || '14:00:00');
      const endMin = timeToMinutes(shift.shift_end || '18:00:00');

      const presentDuringCutoff = (inMin !== null && inMin < cutoffMin && (outMin === null || outMin >= cutoffMin));
      const punchedInSecondHalf = (inMin !== null && inMin >= cutoffMin);

      if (presentDuringCutoff || punchedInSecondHalf) {
        if (outMin !== null) {
          if (outMin >= endMin) {
            secondHalf = 'Present';
          } else {
            secondHalf = 'Absent';
          }
        } else {
          if (dateStr === todayStr) {
            secondHalf = 'Present';
          } else {
            secondHalf = 'Miss Punch';
          }
        }
      } else {
        secondHalf = 'Absent';
      }
    } else if (isWeekend) {
      secondHalf = 'Weekend';
    }
  }

  let overall = 'No Record';

  if (row.is_holiday) {
    overall = 'Holiday';
  } else if (isFuture) {
    if (firstHalf === 'Upcoming' && secondHalf === 'Upcoming') {
      overall = 'Upcoming';
    } else if (firstHalf === 'Leave' || secondHalf === 'Leave') {
      overall = 'Leave';
    } else if (firstHalf === 'WFH' || secondHalf === 'WFH') {
      overall = 'WFH';
    } else {
      overall = 'Upcoming';
    }
  } else {
    const hasOfficePresence = ['Present', 'Late'].includes(firstHalf) || ['Present', 'Late'].includes(secondHalf);
    const hasLeave = firstHalf === 'Leave' || secondHalf === 'Leave';
    const hasWFH = firstHalf === 'WFH' || secondHalf === 'WFH';
    const hasMissPunch = firstHalf === 'Miss Punch' || secondHalf === 'Miss Punch';
    
    if (isWeekend && !hasOfficePresence && !hasLeave && !hasWFH && !hasMissPunch) {
      overall = 'Weekend';
    } else {
      const fPres = ['Present', 'Late'].includes(firstHalf);
      const sPres = ['Present', 'Late'].includes(secondHalf);
      const fWfh = firstHalf === 'WFH';
      const sWfh = secondHalf === 'WFH';
      const fLeave = firstHalf === 'Leave';
      const sLeave = secondHalf === 'Leave';

      if ((fPres || fWfh || fLeave) && (sPres || sWfh || sLeave)) {
        if (fLeave && sLeave) overall = 'Leave';
        else if (fWfh && sWfh) overall = 'WFH';
        else if (firstHalf === 'Late' || secondHalf === 'Late') overall = 'Late';
        else if (fPres && sPres) overall = 'Present';
        else {
          if (fWfh || sWfh) overall = 'WFH';
          else if (fLeave || sLeave) overall = 'Leave';
          else overall = 'Present';
        }
      } else if (hasMissPunch) {
        overall = 'Miss Punch';
      } else if ((fPres || fWfh || fLeave) || (sPres || sWfh || sLeave)) {
        overall = 'Half Day';
      } else {
        overall = 'Absent';
      }
    }
  }

  return { firstHalf, secondHalf, overall };
};

const getAttendanceLwpDays = async (emp_id, month, year) => {
  const m = parseInt(month);
  const y = parseInt(year);
  
  const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const getDaysInMonth = (yearVal, monthVal) => {
    if (monthVal === 2 && ((yearVal % 4 === 0 && yearVal % 100 !== 0) || yearVal % 400 === 0)) return 29;
    return DAYS_IN_MONTH[monthVal];
  };
  const daysInMonth = getDaysInMonth(y, m);
  const startDate = `${y}-${String(m).padStart(2,'0')}-01`;
  const endDate = `${y}-${String(m).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;

  const settingsRes = await query(`SELECT shift_start, shift_end, half_day_cutoff, grace_period_mins FROM attendance_settings LIMIT 1`);
  const shift = settingsRes.rows[0] || { shift_start: '09:00:00', shift_end: '18:00:00', half_day_cutoff: '14:00:00', grace_period_mins: 30 };
  const todayStr = new Date().toISOString().split('T')[0];

  const recordsRes = await query(
    `SELECT to_char(d.date, 'YYYY-MM-DD') as date,
            a.status, a.punch_in, a.punch_out, a.actual_punch_in, a.actual_punch_out, a.is_regularized, a.working_hours,
            l.leave_type, l.half_day_type, l.status as leave_status,
            w.status as wfh_status, w.half_day_type as wfh_half_day_type, w.wfh_type,
            CASE WHEN h.id IS NOT NULL THEN true ELSE false END as is_holiday
     FROM generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) AS d(date)
     LEFT JOIN attendance_records a ON a.emp_id = $3 AND a.date = d.date
     LEFT JOIN leave_applications l ON l.emp_id = $3 AND d.date BETWEEN l.from_date AND l.to_date AND l.status = 'Approved'
     LEFT JOIN wfh_requests w ON w.emp_id = $3 AND w.date = d.date AND w.status = 'Approved'
     LEFT JOIN holidays h ON h.date = d.date`,
    [startDate, endDate, emp_id]
  );

  let uncoveredSessions = 0;

  recordsRes.rows.forEach(row => {
    if (row.is_holiday) return;
    
    const sessionInfo = determineDailySessionStatuses(row, shift, todayStr);
    
    if (row.date > todayStr) return;

    const isFirstUncovered = !['Present', 'Late', 'Leave', 'WFH', 'Weekend', 'Holiday', 'Upcoming'].includes(sessionInfo.firstHalf);
    const isSecondUncovered = !['Present', 'Late', 'Leave', 'WFH', 'Weekend', 'Holiday', 'Upcoming'].includes(sessionInfo.secondHalf);

    if (isFirstUncovered) uncoveredSessions++;
    if (isSecondUncovered) uncoveredSessions++;
  });

  return uncoveredSessions * 0.5;
};

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
      pf: acc.pf + parseFloat(r.pf_employee||0)
    }), { gross:0, net:0, pf:0 });
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
          professional_tax=200, tds=0, other_deductions=0, lwp_days=0, compensation=0, payment_mode='Bank Transfer', status='Processed' } = req.body;
  
  const ctc = parseFloat(rawCtc || fallbackCtc || 0);
  if (!emp_id||!month||!year||!ctc) return error(res,'emp_id, month, year, and ctc required.',400);

  try {
    const empCheck = await query('SELECT doj FROM employees WHERE emp_id = $1', [emp_id]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${emp_id}' does not exist.`, 404);
    }

    const gross = Math.max(0, ctc);
    const basic = Math.round(gross / 2);
    const hra = Math.round(basic * 0.40);
    const conveyance = Math.round(basic * 0.60);

    const pf_er = Math.round(Math.min(basic * 0.13, 1950));
    const pf_emp = basic > 14999 ? 1800 : Math.round(basic * 0.12);
    
    // ESIC applies only if Basic <= 21000, calculated on Basic
    const esic_emp = basic > 21000 ? 0 : Math.round(basic * 0.0075);
    const esic_er = basic > 21000 ? 0 : Math.round(basic * 0.0325);

    const pt = gross > 0 ? 200 : 0;
    const initial_total_ded = pf_emp + esic_emp + pt + (parseFloat(other_deductions) || 0);
    
    // Calculate initial Net, capped so it never goes negative
    let total_ded = Math.min(gross, initial_total_ded);
    let net = gross - total_ded;
    
    // Auto-LWP from Leave Balances and DOJ (Prorated Salary)
    let auto_lwp_days = 0;
    
    // Prorate salary for mid-month joiners
    const doj = empCheck.rows[0].doj ? new Date(empCheck.rows[0].doj) : null;
    if (doj && doj.getFullYear() === parseInt(year) && (doj.getMonth() + 1) === parseInt(month)) {
      auto_lwp_days += Math.max(0, doj.getDate() - 1);
    }
    const lbRes = await query('SELECT lb.*, e.probation_status FROM leave_balances lb JOIN employees e ON e.emp_id=lb.emp_id WHERE lb.emp_id=$1 AND lb.year=$2', [emp_id, year]);
    if (lbRes.rows.length > 0) {
       const lb = lbRes.rows[0];
       const isProbation = lb.probation_status === 'Pending';
       const types = ['cl', 'el', 'ml', 'ccl', 'sl', 'dl'];
       let total_negative_balance = 0;
       for (let t of types) {
           let entitled = parseFloat(lb[`${t}_entitled`] || 0);
           const used = parseFloat(lb[`${t}_used`] || 0);
           
           if (isProbation) {
               entitled = (t === 'sl') ? 2 : 0;
           }
           
           if (used > entitled) {
               total_negative_balance += (used - entitled);
           }
       }
       
       if (total_negative_balance > 0) {
           const prevLwpRes = await query('SELECT SUM(lwp_days) as total_prev_lwp FROM payroll_records WHERE emp_id=$1 AND year=$2 AND month < $3', [emp_id, year, month]);
           const prev_lwp = parseFloat(prevLwpRes.rows[0].total_prev_lwp || 0);
           auto_lwp_days = total_negative_balance - prev_lwp;
           if (auto_lwp_days < 0) auto_lwp_days = 0;
       }
    }
    
    const attendanceLwp = await getAttendanceLwpDays(emp_id, month, year);
    const final_lwp_days = parseFloat(lwp_days || 0) + auto_lwp_days + attendanceLwp;
    
    // LWP Calculation
    const daysInMonth = new Date(year, month, 0).getDate();
    let lwp_amount = Math.round((net / daysInMonth) * final_lwp_days);
    if (lwp_amount > net) lwp_amount = net; // Cap LWP
    
    // Final Net after LWP
    net = net - lwp_amount;
    const final_total_ded = total_ded + lwp_amount; // LWP is part of deductions

    // Add compensation
    const comp_amount = parseFloat(compensation) || 0;
    net = net + comp_amount;

    const real_ctc = gross + pf_er; // User's formula: CTC = Gross salary + Employer PF

    const result = await query(
      `INSERT INTO payroll_records(emp_id,month,year,ctc,basic_pay,hra_amount,ta_amount,
        gross_pay,pf_employee,esic_employee,pf_employer,esic_employer,professional_tax,tds,
        other_deductions,lwp_days,lwp_amount,total_deductions,compensation,net_pay,payment_mode,status,processed_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       ON CONFLICT(emp_id,month,year) DO UPDATE SET
         ctc=EXCLUDED.ctc, basic_pay=EXCLUDED.basic_pay, hra_amount=EXCLUDED.hra_amount,
         ta_amount=EXCLUDED.ta_amount, gross_pay=EXCLUDED.gross_pay,
         pf_employee=EXCLUDED.pf_employee, esic_employee=EXCLUDED.esic_employee,
         pf_employer=EXCLUDED.pf_employer, esic_employer=EXCLUDED.esic_employer,
         professional_tax=EXCLUDED.professional_tax, tds=EXCLUDED.tds,
         other_deductions=EXCLUDED.other_deductions, lwp_days=EXCLUDED.lwp_days, lwp_amount=EXCLUDED.lwp_amount, 
         total_deductions=EXCLUDED.total_deductions, compensation=EXCLUDED.compensation,
         net_pay=EXCLUDED.net_pay, payment_mode=EXCLUDED.payment_mode, status=EXCLUDED.status,
         processed_by=EXCLUDED.processed_by, updated_at=NOW()
       RETURNING *`,
      [emp_id, month, year, real_ctc, basic, hra, conveyance, gross, pf_emp, esic_emp, pf_er, esic_er,
       pt, parseFloat(tds) || 0, parseFloat(other_deductions) || 0, final_lwp_days, lwp_amount, final_total_ded, comp_amount, net, payment_mode, status, req.user.id]
    );
    return success(res, result.rows[0], 'Payroll processed');
  } catch (err) { return error(res, err.message); }
};

exports.processAll = async (req, res) => {
  const { month, year } = req.body;
  if (!month||!year) return error(res,'month and year required.',400);
  try {
    const emps = await query(`SELECT emp_id, ctc, basic_pay, doj FROM employees WHERE status='Active' AND (ctc > 0 OR basic_pay > 0)`);
    let processed = 0;
    for (const e of emps.rows) {
      const ctc = parseFloat(e.ctc || e.basic_pay || 0);
      if (!ctc) continue;

      const gross = Math.max(0, ctc); // Input is treated as Gross Salary
      const basic = Math.round(gross / 2);
      const hra = Math.round(basic * 0.40);
      const conveyance = Math.round(basic * 0.60);

      const pf_er = Math.round(Math.min(basic * 0.13, 1950));
      const pf_emp = basic > 14999 ? 1800 : Math.round(basic * 0.12);

      const esic_emp = basic > 21000 ? 0 : Math.round(basic * 0.0075);
      const esic_er = basic > 21000 ? 0 : Math.round(basic * 0.0325);
      
      const pt = gross > 0 ? 200 : 0;
      const tds_val = 0; // TDS removed as per requirement
      
      const initial_total_ded = pf_emp + esic_emp + pt + tds_val;
      let total_ded = Math.min(gross, initial_total_ded);
      let net = gross - total_ded;

      // Auto-LWP from Leave Balances and DOJ (Prorated Salary)
      let auto_lwp_days = 0;

      // Prorate salary for mid-month joiners
      const doj = e.doj ? new Date(e.doj) : null;
      if (doj && doj.getFullYear() === parseInt(year) && (doj.getMonth() + 1) === parseInt(month)) {
        auto_lwp_days += Math.max(0, doj.getDate() - 1);
      }
      const lbRes = await query('SELECT lb.*, e.probation_status FROM leave_balances lb JOIN employees e ON e.emp_id=lb.emp_id WHERE lb.emp_id=$1 AND lb.year=$2', [e.emp_id, year]);
      if (lbRes.rows.length > 0) {
         const lb = lbRes.rows[0];
         const isProbation = lb.probation_status === 'Pending';
         const types = ['cl', 'el', 'ml', 'ccl', 'sl', 'dl'];
         let total_negative_balance = 0;
         for (let t of types) {
             let entitled = parseFloat(lb[`${t}_entitled`] || 0);
             const used = parseFloat(lb[`${t}_used`] || 0);
             
             if (isProbation) {
                 entitled = (t === 'sl') ? 2 : 0;
             }
             
             if (used > entitled) {
                 total_negative_balance += (used - entitled);
             }
         }
         
         if (total_negative_balance > 0) {
             const prevLwpRes = await query('SELECT SUM(lwp_days) as total_prev_lwp FROM payroll_records WHERE emp_id=$1 AND year=$2 AND month < $3', [e.emp_id, year, month]);
             const prev_lwp = parseFloat(prevLwpRes.rows[0].total_prev_lwp || 0);
             auto_lwp_days = total_negative_balance - prev_lwp;
             if (auto_lwp_days < 0) auto_lwp_days = 0;
         }
      }

      // Calculate LWP for processAll
      const attendanceLwp = await getAttendanceLwpDays(e.emp_id, month, year);
      const final_lwp_days = auto_lwp_days + attendanceLwp;
      const daysInMonth = new Date(year, month, 0).getDate();
      let lwp_amount = Math.round((net / daysInMonth) * final_lwp_days);
      if (lwp_amount > net) lwp_amount = net; // Cap LWP
      
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