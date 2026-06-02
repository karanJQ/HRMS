const { query } = require('./src/config/database');

async function test() {
  try {
    console.log("Creating test employee with 5 days probation...");
    
    // Auto generate emp_id
    const countRes = await query('SELECT COUNT(*) FROM employees');
    const num = parseInt(countRes.rows[0].count) + 1;
    const emp_id = 'EMP' + String(num).padStart(5, '0');
    
    // Insert test employee
    // DOJ is today
    const d = new Date();
    const dojStr = d.toISOString().split('T')[0];
    
    // Probation end date is today + 5 days
    d.setDate(d.getDate() + 5);
    const probEndStr = d.toISOString().split('T')[0];
    
    // DOB is 1990-01-01
    const dob = '1990-01-01';
    
    await query(`
      INSERT INTO employees (
        emp_id, first_name, last_name, gender, dob, dor, mobile, dept_id, designation_id, 
        doj, status, created_by, probation_days, probation_end_date, probation_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 1, 1, $8, 'Active', 1, 5, $9, 'Pending'
      )
    `, [emp_id, 'Test', 'Probation', 'Male', dob, dob, '9999999999', dojStr, probEndStr]);

    console.log(`Employee created: ${emp_id}`);

    console.log("Checking probation alerts...");
    const alerts = await query(`
      SELECT e.emp_id, e.first_name, e.probation_end_date 
      FROM employees e
      WHERE e.probation_status = 'Pending' 
        AND e.status = 'Active'
        AND e.probation_end_date <= CURRENT_DATE + INTERVAL '7 days'
    `);
    console.log(`Alerts found: ${alerts.rows.length}`);
    alerts.rows.forEach(r => console.log(r));

  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

test();
