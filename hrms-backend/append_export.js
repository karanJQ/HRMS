const fs = require('fs');

const exportCsvCode = `

exports.exportCSV = async (req, res) => {
  const { month, year, emp_id } = req.query;
  try {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const daysInMonth = getDaysInMonth(y, m);
    const startDate = \`\${y}-\${String(m).padStart(2,'0')}-01\`;
    const endDate = \`\${y}-\${String(m).padStart(2,'0')}-\${String(daysInMonth).padStart(2,'0')}\`;

    let eId = null;
    if (req.user.role === 'employee') {
      eId = req.user.emp_id;
    } else if (emp_id) {
      eId = emp_id;
    }

    let recordsRes;
    if (eId) {
      // Single employee
      recordsRes = await query(
        \`SELECT 
            e.emp_id, e.first_name, e.last_name, d_dept.name as department,
            to_char(d.date, 'YYYY-MM-DD') as date,
            a.status, a.punch_in, a.punch_out, a.working_hours,
            l.leave_type, l.status as leave_status,
            w.status as wfh_status,
            CASE WHEN h.id IS NOT NULL THEN h.name ELSE '' END as holiday_name
         FROM generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) AS d(date)
         CROSS JOIN (SELECT emp_id, first_name, last_name, dept_id FROM employees WHERE emp_id = $3) e
         LEFT JOIN departments d_dept ON e.dept_id = d_dept.id
         LEFT JOIN attendance_records a ON a.emp_id = e.emp_id AND a.date = d.date
         LEFT JOIN leave_applications l ON l.emp_id = e.emp_id AND d.date BETWEEN l.from_date AND l.to_date AND l.status = 'Approved'
         LEFT JOIN wfh_requests w ON w.emp_id = e.emp_id AND w.date = d.date AND w.status = 'Approved'
         LEFT JOIN holidays h ON h.date = d.date
         ORDER BY d.date\`,
        [startDate, endDate, eId]
      );
    } else {
      // All employees (bulk)
      recordsRes = await query(
        \`SELECT 
            e.emp_id, e.first_name, e.last_name, d_dept.name as department,
            to_char(d.date, 'YYYY-MM-DD') as date,
            a.status, a.punch_in, a.punch_out, a.working_hours,
            l.leave_type, l.status as leave_status,
            w.status as wfh_status,
            CASE WHEN h.id IS NOT NULL THEN h.name ELSE '' END as holiday_name
         FROM employees e
         CROSS JOIN generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) AS d(date)
         LEFT JOIN departments d_dept ON e.dept_id = d_dept.id
         LEFT JOIN attendance_records a ON a.emp_id = e.emp_id AND a.date = d.date
         LEFT JOIN leave_applications l ON l.emp_id = e.emp_id AND d.date BETWEEN l.from_date AND l.to_date AND l.status = 'Approved'
         LEFT JOIN wfh_requests w ON w.emp_id = e.emp_id AND w.date = d.date AND w.status = 'Approved'
         LEFT JOIN holidays h ON h.date = d.date
         WHERE e.status = 'Active'
         ORDER BY e.emp_id, d.date\`,
        [startDate, endDate]
      );
    }

    // Prepare CSV
    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '';
      const s = String(str);
      if (s.includes(',') || s.includes('"') || s.includes('\\n')) {
        return \`"\${s.replace(/"/g, '""')}"\`;
      }
      return s;
    };

    let csvContent = 'Employee ID,Name,Department,Date,Punch In,Punch Out,Working Hours,Status\\n';
    
    const todayStr = new Date().toISOString().split('T')[0];

    recordsRes.rows.forEach(row => {
      const isWeekend = new Date(row.date + 'T00:00:00').getDay() === 0 || new Date(row.date + 'T00:00:00').getDay() === 6;
      const isFuture = row.date > todayStr;
      
      let computedStatus = '';
      if (row.punch_in) {
        if (row.working_hours !== null && parseFloat(row.working_hours) < 9) {
          computedStatus = 'Half Day';
        } else {
          computedStatus = 'Present';
        }
      } else if (row.holiday_name) {
        computedStatus = 'Holiday (' + row.holiday_name + ')';
      } else if (isFuture) {
        if (row.leave_status === 'Approved') computedStatus = row.leave_type;
        else if (row.wfh_status === 'Approved') computedStatus = 'WFH';
        else computedStatus = 'Upcoming';
      } else if (row.leave_status === 'Approved') {
        computedStatus = row.leave_type;
      } else if (row.wfh_status === 'Approved') {
        computedStatus = 'WFH';
      } else if (isWeekend) {
        computedStatus = 'Weekend';
      } else if (row.date < todayStr) {
        computedStatus = 'Absent';
      } else {
        computedStatus = 'No Record';
      }

      const wh = row.working_hours;
      let finalWh = wh || '';
      if ((!wh || parseFloat(wh) === 0) && row.punch_in && row.punch_out) {
        const [ih, im] = row.punch_in.split(':');
        const [oh, om] = row.punch_out.split(':');
        const diff = (parseInt(oh)*60+parseInt(om)) - (parseInt(ih)*60+parseInt(im));
        finalWh = Math.max(0, diff / 60).toFixed(1);
      }

      const name = \`\${row.first_name || ''} \${row.last_name || ''}\`.trim();
      
      const line = [
        row.emp_id,
        name,
        row.department,
        row.date,
        row.punch_in ? row.punch_in.slice(0, 5) : '',
        row.punch_out ? row.punch_out.slice(0, 5) : '',
        finalWh,
        computedStatus
      ].map(escapeCsv).join(',');

      csvContent += line + '\\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', \`attachment; filename=Attendance_Report_\${y}_\${String(m).padStart(2,'0')}.csv\`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Export CSV Error:', err);
    return error(res, err.message, 500);
  }
};
`;

fs.appendFileSync('src/controllers/attendance.controller.js', exportCsvCode);
console.log('Appended exportCSV');
