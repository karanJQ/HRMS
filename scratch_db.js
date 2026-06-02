const fs = require('fs');
const env = fs.readFileSync('./hrms-backend/.env', 'utf8');
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
});

const { query } = require('./hrms-backend/src/config/database');

async function update() {
  try {
    const loc = JSON.stringify({ lat: 28.704060, lng: 77.102493, address: "Delhi, India" });
    await query(`UPDATE attendance_records SET location = $1, photo_url = '/uploads/attendance/mock.webp' WHERE id = 2`, [loc]);
    const res = await query(`SELECT * FROM attendance_records WHERE id = 2`);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

update();
