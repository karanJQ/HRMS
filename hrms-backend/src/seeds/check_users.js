require('dotenv').config();
const { pool } = require('../config/database');

async function testProcessAllBug() {
  const client = await pool.connect();
  try {
    const emps = await client.query(
      `SELECT emp_id, ctc, basic_pay, doj FROM employees WHERE status='Active' AND (ctc > 0 OR basic_pay > 0)`
    );
    let processed = 0;
    for (const e of emps.rows) {
      const ctc = parseFloat(e.ctc) || parseFloat(e.basic_pay) || 0;
      if (!ctc) {
        console.log(`Skipping ${e.emp_id} - ctc is ${ctc}`);
        continue;
      }
      processed++;
    }
    console.log(`Will process ${processed} out of ${emps.rows.length} eligible employees.`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}
testProcessAllBug();
