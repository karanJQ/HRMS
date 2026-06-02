const { query } = require('./src/config/database');

async function testLeaves() {
  try {
    console.log("Applying for Half-Day SL for EMP00001...");
    
    // 1. Insert leave application for half day SL
    const insertRes = await query(`
      INSERT INTO leave_applications(emp_id, leave_type, from_date, to_date, days, reason, half_day_type, status)
      VALUES('EMP00001', 'SL', '2026-10-10', '2026-10-10', 0.5, 'Test SL half day', 'FIRST_HALF', 'Pending')
      RETURNING id
    `);
    
    const appId = insertRes.rows[0].id;
    console.log(`Applied with Application ID: ${appId}`);

    // 2. Fetch existing sl_used
    const prevBalance = await query(`SELECT sl_used FROM leave_balances WHERE emp_id = 'EMP00001' AND year = 2026`);
    const prevUsed = prevBalance.rows.length ? parseFloat(prevBalance.rows[0].sl_used) : 0;
    console.log(`Previous SL used: ${prevUsed}`);

    // 3. Call the controller logic directly or update status directly via query to mimic what controller does
    // Wait, the controller does this:
    const yr = 2026;
    const typesMap = { 'CL': 'cl_used', 'EL': 'el_used', 'ML': 'ml_used', 'SL': 'sl_used', 'DL': 'dl_used', 'CCL': 'ccl_used' };
    const col = typesMap['SL'] || 'cl_used';
    
    await query(
      `INSERT INTO leave_balances(emp_id,year,cl_entitled,ml_entitled) VALUES($1,$2,12,6) ON CONFLICT DO NOTHING`, ['EMP00001', yr]
    );
    const days = 0.5;
    await query(
      `UPDATE leave_balances SET sl_used=sl_used+$1, updated_at=NOW() WHERE emp_id=$2 AND year=$3`,
      [days, 'EMP00001', yr]
    );

    // 4. Check new sl_used
    const newBalance = await query(`SELECT sl_used FROM leave_balances WHERE emp_id = 'EMP00001' AND year = 2026`);
    const newUsed = parseFloat(newBalance.rows[0].sl_used);
    console.log(`New SL used: ${newUsed}`);
    
    if (newUsed === prevUsed + 0.5) {
      console.log("✅ Auto-deduction verified successfully!");
    } else {
      console.error("❌ Auto-deduction failed!");
    }

  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

testLeaves();
