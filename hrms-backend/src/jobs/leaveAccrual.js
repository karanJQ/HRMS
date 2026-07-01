const cron = require('node-cron');
const { query } = require('../config/database');

const runLeaveAccrual = async () => {
    try {
        console.log('Running monthly leave accrual job...');
        
        const now = new Date();
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const targetYear = prevMonthDate.getFullYear();
        const targetMonth = prevMonthDate.getMonth() + 1; // 1-12

        // Ensure logs table exists
        await query(`
            CREATE TABLE IF NOT EXISTS leave_accrual_logs (
                id SERIAL PRIMARY KEY,
                year INT,
                month INT,
                ran_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(year, month)
            )
        `);

        // Check if already run for targetYear and targetMonth
        const check = await query(`SELECT id FROM leave_accrual_logs WHERE year = $1 AND month = $2`, [targetYear, targetMonth]);
        if (check.rows.length > 0) {
            console.log(`Accrual for ${targetYear}-${targetMonth} already processed. Skipping...`);
            return;
        }

        // Fetch all active employees
        const employees = await query("SELECT emp_id, doj FROM employees WHERE status = 'Active'");
        
        let accruedCount = 0;

        for (const emp of employees.rows) {
            const doj = new Date(emp.doj);
            
            // If they joined in the target month/year AFTER the 15th, skip them for this month
            if (doj.getFullYear() === targetYear && (doj.getMonth() + 1) === targetMonth && doj.getDate() > 15) {
                console.log(`Skipping accrual for ${emp.emp_id} (joined after 15th)`);
                continue;
            }

            // Also skip if they joined after the target month (e.g. joined in the current month)
            if (doj > new Date(targetYear, targetMonth - 1, 31)) {
                 continue;
            }

            // Upsert the leave balance for the year of the target month
            // We use targetYear so if it runs on Jan 1st 2027, it updates Dec 2026's balance!
            
            await query(`INSERT INTO leave_balances(emp_id, year) VALUES($1, $2) ON CONFLICT DO NOTHING`, [emp.emp_id, targetYear]);
            
            await query(`
                UPDATE leave_balances 
                SET el_entitled = el_entitled + 1, 
                    sl_entitled = sl_entitled + 0.5,
                    updated_at = NOW()
                WHERE emp_id = $1 AND year = $2
            `, [emp.emp_id, targetYear]);
            
            accruedCount++;
        }
        
        // Log the successful completion
        await query(`INSERT INTO leave_accrual_logs(year, month) VALUES($1, $2) ON CONFLICT DO NOTHING`, [targetYear, targetMonth]);
        console.log(`Monthly leave accrual completed. Accrued for ${accruedCount} employees.`);
    } catch (err) {
        console.error('Error in monthly leave accrual job:', err);
    }
};

// Run at 00:00 on the 1st of every month
cron.schedule('0 0 1 * *', () => {
    runLeaveAccrual();
});

// Run once on application startup to catch any missed accruals
runLeaveAccrual();

module.exports = {
    runLeaveAccrual
};
