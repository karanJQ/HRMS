const fs = require('fs');

let content = fs.readFileSync('src/controllers/attendance.controller.js', 'utf8');

const correctGetCalendar = `exports.getCalendar = async (req, res) => {
  const { month, year, emp_id } = req.query;
  try {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const eId = req.user.role === 'employee' ? req.user.emp_id : (emp_id || req.user.emp_id);
    if (!eId) return success(res, [], 'No employee specified');

    const daysInMonth = getDaysInMonth(y, m);

    const recordsRes = await query(
      \`SELECT to_char(d.date, 'YYYY-MM-DD') as date,
              a.status, a.punch_in, a.punch_out, a.biometric_sync, a.is_regularized, a.working_hours, a.location, a.photo_url,
              l.leave_type, l.half_day_type, l.status as leave_status,
              w.status as wfh_status,
              CASE WHEN h.id IS NOT NULL THEN true ELSE false END as is_holiday,
              h.name as holiday_name
       FROM generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) AS d(date)
       LEFT JOIN attendance_records a ON a.emp_id = $3 AND a.date = d.date
       LEFT JOIN leave_applications l ON l.emp_id = $3 AND d.date BETWEEN l.from_date AND l.to_date AND l.status = 'Approved'
       LEFT JOIN wfh_requests w ON w.emp_id = $3 AND w.date = d.date AND w.status = 'Approved'
       LEFT JOIN holidays h ON h.date = d.date
       ORDER BY d.date\`,
      [\`\${y}-\${String(m).padStart(2,'0')}-01\`, \`\${y}-\${String(m).padStart(2,'0')}-\${String(daysInMonth).padStart(2,'0')}\`, eId]
    );

    const result = recordsRes.rows.map(row => {
      const dateStr = row.date;
      const d = new Date(dateStr + 'T00:00:00');
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const today = new Date();
      const todayStr = \`\${today.getFullYear()}-\${String(today.getMonth()+1).padStart(2,'0')}-\${String(today.getDate()).padStart(2,'0')}\`;
      const isFuture = dateStr > todayStr;

      let computedStatus;
      if (row.punch_in) {
        if (row.working_hours !== null && parseFloat(row.working_hours) < 9) {
          computedStatus = 'Half Day';
        } else {
          computedStatus = 'Present';
        }
      } else if (row.is_holiday) {
        computedStatus = 'Holiday';
      } else if (isFuture) {
        if (row.leave_status === 'Approved') {
          computedStatus = ['FIRST_HALF','SECOND_HALF'].includes(row.half_day_type) ? 'Half Day'
                       : row.leave_type === 'WFH' ? 'WFH' : 'Leave';
        } else if (row.wfh_status === 'Approved') {
          computedStatus = 'WFH';
        } else if (row.status) {
          computedStatus = row.status;
        } else {
          computedStatus = 'Upcoming';
        }
      } else if (row.leave_status === 'Approved') {
        computedStatus = ['FIRST_HALF','SECOND_HALF'].includes(row.half_day_type) ? 'Half Day'
                     : row.leave_type === 'WFH' ? 'WFH' : 'Leave';
      } else if (row.status) {
        computedStatus = row.status;
      } else if (row.wfh_status === 'Approved') {
        computedStatus = 'WFH';
      } else if (isWeekend) {
        computedStatus = 'Weekend';
      } else if (dateStr < todayStr) {
        computedStatus = 'Absent';
      } else {
        computedStatus = 'No Record';
      }

      const wh = row.working_hours;
      if ((!wh || parseFloat(wh) === 0) && row.punch_in && row.punch_out) {
        const [ih, im] = row.punch_in.split(':');
        const [oh, om] = row.punch_out.split(':');
        const diff = (parseInt(oh)*60+parseInt(om)) - (parseInt(ih)*60+parseInt(im));
        row.working_hours = Math.max(0, diff / 60).toFixed(1);
      }

      return {
        date: dateStr,
        status: computedStatus,
        punch_in: row.punch_in,
        punch_out: row.punch_out,
        biometric_sync: row.biometric_sync,
        is_regularized: row.is_regularized,
        working_hours: row.working_hours,
        location: row.location,
        photo_url: row.photo_url,
        is_holiday: row.is_holiday,
        holiday_name: row.holiday_name,
        leave_type: row.leave_type,
        half_day_type: row.half_day_type,
        wfh_status: row.wfh_status,
        dayOfWeek: d.getDay()
      };
    });

    return success(res, { calendar: result, month: m, year: y, daysInMonth });
  } catch (err) {
    return error(res, err.message, 500);
  }
};`;

content = content.replace(/exports\.getCalendar = async \(req, res\) => \{[\s\S]*?(?=\nexports\.getMonthlyStats = async)/, correctGetCalendar);

fs.writeFileSync('src/controllers/attendance.controller.js', content);
console.log('Fixed getCalendar');
