const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.dashboard = async (req, res) => {
  try {
    const [empCount, activeCount, payrollSum, pendingLeaves, openGrievances, pendingOnboard, pendingTransfers] = await Promise.all([
      query("SELECT COUNT(*) FROM employees"),
      query("SELECT COUNT(*) FROM employees WHERE status='Active'"),
      query("SELECT COALESCE(SUM(net_pay),0) as total FROM payroll_records WHERE month=EXTRACT(MONTH FROM NOW()) AND year=EXTRACT(YEAR FROM NOW())"),
      query("SELECT COUNT(*) FROM leave_applications WHERE status='Pending'"),
      query("SELECT COUNT(*) FROM grievances WHERE status NOT IN ('Resolved','Closed')"),
      query("SELECT COUNT(*) FROM onboarding_candidates WHERE status NOT IN ('Completed','Cancelled')"),
      query("SELECT COUNT(*) FROM transfers WHERE status='Pending Approval'"),
    ]);
    return success(res, {
      total_employees: parseInt(empCount.rows[0].count),
      active_employees: parseInt(activeCount.rows[0].count),
      monthly_payroll: parseFloat(payrollSum.rows[0].total),
      pending_leaves: parseInt(pendingLeaves.rows[0].count),
      open_grievances: parseInt(openGrievances.rows[0].count),
      pending_onboarding: parseInt(pendingOnboard.rows[0].count),
      pending_transfers: parseInt(pendingTransfers.rows[0].count),
    });
  } catch (err) { return error(res, err.message); }
};

exports.headcount = async (req, res) => {
  try {
    const [byDept, byCategory, byGrade, byStatus, bySeniority] = await Promise.all([
      query(`SELECT d.name as dept, COUNT(e.id) as count FROM departments d LEFT JOIN employees e ON e.dept_id=d.id AND e.status='Active' GROUP BY d.name ORDER BY count DESC`),
      query(`SELECT category, COUNT(*) as count FROM employees WHERE status='Active' GROUP BY category`),
      query(`SELECT grade, COUNT(*) as count FROM employees WHERE status='Active' AND grade IS NOT NULL GROUP BY grade ORDER BY grade`),
      query(`SELECT 
        CASE 
          WHEN a.is_wfh = true THEN 'WFH' 
          WHEN a.id IS NOT NULL THEN 'Present' 
          WHEN l.id IS NOT NULL THEN 'On Leave' 
          ELSE 'Absent' 
        END as status, 
        COUNT(e.id) as count 
      FROM employees e 
      LEFT JOIN attendance_records a ON a.emp_id = e.emp_id AND a.date = CURRENT_DATE 
      LEFT JOIN leave_applications l ON l.emp_id = e.emp_id AND l.status = 'Approved' AND CURRENT_DATE BETWEEN l.from_date AND l.to_date 
      WHERE e.status = 'Active' 
      GROUP BY 1`),
      query(`SELECT EXTRACT(YEAR FROM AGE(NOW(),doj)) as service_years, COUNT(*) as count FROM employees WHERE status='Active' GROUP BY service_years ORDER BY service_years`),
    ]);
    return success(res, { by_dept:byDept.rows, by_category:byCategory.rows, by_grade:byGrade.rows, by_status:byStatus.rows, by_seniority:bySeniority.rows });
  } catch (err) { return error(res, err.message); }
};

exports.payrollReport = async (req, res) => {
  const { year } = req.query;
  const yr = parseInt(year) || new Date().getFullYear();
  try {
    const monthly = await query(
      `SELECT month, SUM(gross_pay) as gross, SUM(net_pay) as net, SUM(pf_employee) as pf, COUNT(*) as emp_count
       FROM payroll_records WHERE year=$1 GROUP BY month ORDER BY month`, [yr]
    );
    const byDept = await query(
      `SELECT d.name as dept, SUM(pr.gross_pay) as gross, SUM(pr.net_pay) as net, COUNT(*) as emp_count
       FROM payroll_records pr JOIN employees e ON e.emp_id=pr.emp_id
       JOIN departments d ON d.id=e.dept_id
       WHERE pr.year=$1 GROUP BY d.name ORDER BY gross DESC`, [yr]
    );
    return success(res, { monthly: monthly.rows, by_dept: byDept.rows, year: yr });
  } catch (err) { return error(res, err.message); }
};

exports.leaveReport = async (req, res) => {
  const yr = parseInt(req.query.year) || new Date().getFullYear();
  try {
    const byType = await query(
      `SELECT leave_type, COUNT(*) as applications, SUM(days) as total_days,
       SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END) as approved
       FROM leave_applications WHERE EXTRACT(YEAR FROM from_date)=$1
       GROUP BY leave_type`, [yr]
    );
    const byDept = await query(
      `SELECT d.name as dept, COUNT(la.id) as applications, SUM(la.days) as total_days
       FROM leave_applications la JOIN employees e ON e.emp_id=la.emp_id
       JOIN departments d ON d.id=e.dept_id
       WHERE EXTRACT(YEAR FROM la.from_date)=$1 AND la.status='Approved'
       GROUP BY d.name ORDER BY total_days DESC`, [yr]
    );
    return success(res, { by_type: byType.rows, by_dept: byDept.rows });
  } catch (err) { return error(res, err.message); }
};

exports.attendanceInsights = async (req, res) => {
  try {
    const avgHours = await query(`
      SELECT d.name as dept, AVG(a.working_hours) as avg_hours
      FROM attendance_logs a
      JOIN employees e ON e.emp_id = a.emp_id
      JOIN departments d ON d.id = e.dept_id
      WHERE EXTRACT(MONTH FROM a.date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM a.date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND a.working_hours > 0
      GROUP BY d.name
      ORDER BY avg_hours DESC
    `);
    
    const lateTrends = await query(`
      SELECT d.name as dept, COUNT(*) as late_count
      FROM attendance_logs a
      JOIN employees e ON e.emp_id = a.emp_id
      JOIN departments d ON d.id = e.dept_id
      WHERE EXTRACT(MONTH FROM a.date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM a.date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND a.status = 'Half Day'
      GROUP BY d.name
      ORDER BY late_count DESC
    `);
    
    return success(res, { avg_hours: avgHours.rows, late_trends: lateTrends.rows });
  } catch (err) { return error(res, err.message); }
};

exports.demographics = async (req, res) => {
  try {
    const genderRatio = await query(`
      SELECT gender, COUNT(*) as count 
      FROM employees 
      WHERE status = 'Active' 
      GROUP BY gender
    `);
    
    const ageBrackets = await query(`
      SELECT 
        CASE 
          WHEN age_years < 30 THEN '20-29'
          WHEN age_years < 40 THEN '30-39'
          WHEN age_years < 50 THEN '40-49'
          ELSE '50+' 
        END as age_group,
        COUNT(*) as count
      FROM (
        SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob)) as age_years 
        FROM employees 
        WHERE status = 'Active' AND dob IS NOT NULL
      ) as ages
      GROUP BY age_group
      ORDER BY age_group
    `);
    
    return success(res, { gender: genderRatio.rows, age: ageBrackets.rows });
  } catch (err) { return error(res, err.message); }
};

exports.getProbationAlerts = async (req, res) => {
  try {
    const { recentOnly } = req.query;
    let dateFilter = '';
    if (recentOnly === 'true') {
      dateFilter = `AND e.probation_end_date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '7 days'`;
    } else {
      // Just something reasonable or all pending
      // Originally it was <= CURRENT_DATE + 7 days
    }

    const alerts = await query(
      `SELECT e.emp_id, e.first_name, e.last_name, e.doj, e.probation_days, e.probation_end_date,
              d.name as dept_name, des.name as designation_name
       FROM employees e
       JOIN departments d ON d.id=e.dept_id
       LEFT JOIN designations des ON des.id=e.designation_id
       WHERE e.probation_status = 'Pending' 
         AND e.status = 'Active'
         ${dateFilter}
       ORDER BY e.probation_end_date ASC`
    );
    return success(res, alerts.rows);
  } catch (err) { return error(res, err.message); }
};