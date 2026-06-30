require('dotenv').config();
const { runLeaveAccrual } = require('./src/jobs/leaveAccrual');

(async () => {
    console.log("Triggering manual leave accrual test...");
    await runLeaveAccrual();
    console.log("Test completed!");
    process.exit(0);
})();
