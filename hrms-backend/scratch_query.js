const { query } = require('./src/config/database');

async function run() {
  try {
    const res = await query(`SELECT DISTINCT status FROM attendance_records`);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
