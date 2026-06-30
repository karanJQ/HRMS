require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./src/config/database');

async function seedAmit() {
  try {
    const empRes = await query(`SELECT emp_id, dept_id FROM employees WHERE official_email = 'amit.desai@company.com' LIMIT 1`);
    if (empRes.rows.length > 0) {
      const emp = empRes.rows[0];
      const hash = await bcrypt.hash('Emp@123456', 12);
      await query(`
        INSERT INTO users (username, email, password_hash, role, dept_id, emp_id, is_active, must_change_pw)
        VALUES ('amit.desai', 'amit.desai@company.com', $1, 'employee', $2, $3, true, false)
        ON CONFLICT (email) DO NOTHING
      `, [hash, emp.dept_id, emp.emp_id]);
      console.log('Amit Desai user seeded successfully!');
    } else {
      console.log('Employee Amit Desai not found in DB.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
seedAmit();
