require('dotenv').config();
const { query } = require('./src/config/database');

(async () => {
    try {
        console.log("Running leave backfill script...");
        const targetYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // 1-12. If it's June, this is 6.

        const employees = await query("SELECT emp_id, doj FROM employees WHERE status = 'Active'");
        
        for (const emp of employees.rows) {
            const doj = new Date(emp.doj);
            let eligibleMonths = 0;

            // We only backfill for months prior to the current month in the current year.
            // E.g., if it is June (6), we look at Jan (1) to May (5).
            for (let m = 1; m < currentMonth; m++) {
                // If DOJ is in a previous year, they get this month.
                if (doj.getFullYear() < targetYear) {
                    eligibleMonths++;
                } 
                // If DOJ is in the current year, check if DOJ is before or during this month
                else if (doj.getFullYear() === targetYear) {
                    if (doj.getMonth() + 1 < m) {
                        eligibleMonths++; // DOJ was in an earlier month
                    } else if (doj.getMonth() + 1 === m) {
                        // DOJ is in this month. Check if before or on 15th
                        if (doj.getDate() <= 15) {
                            eligibleMonths++;
                        }
                    }
                }
            }

            if (eligibleMonths > 0) {
                const totalEl = eligibleMonths * 1.0;
                const totalSl = eligibleMonths * 0.5;
                
                await query(`INSERT INTO leave_balances(emp_id, year) VALUES($1, $2) ON CONFLICT DO NOTHING`, [emp.emp_id, targetYear]);
                
                // We overwrite instead of add, to fix the double count from our previous manual test run!
                await query(`
                    UPDATE leave_balances 
                    SET el_entitled = $1, 
                        sl_entitled = $2,
                        updated_at = NOW()
                    WHERE emp_id = $3 AND year = $4
                `, [totalEl, totalSl, emp.emp_id, targetYear]);
                
                console.log(`Backfilled ${emp.emp_id}: ${eligibleMonths} months -> ${totalEl} EL, ${totalSl} SL`);
            }
        }
        
        console.log("Backfill completed!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
