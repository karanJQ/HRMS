require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration() {
  const sqlFile1 = path.join(__dirname, '001_schema.sql');
  const sqlFile2 = path.join(__dirname, '002_tasks_attendance.sql');
  const sqlFile3 = path.join(__dirname, '003_attendance_rules.sql');
  const sqlFile4 = path.join(__dirname, '004_notifications.sql');
  const sql1 = fs.readFileSync(sqlFile1, 'utf8');
  const sql2 = fs.readFileSync(sqlFile2, 'utf8');
  const sql3 = fs.readFileSync(sqlFile3, 'utf8');
  const sql4 = fs.readFileSync(sqlFile4, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql1);
    await client.query(sql2);
    await client.query(sql3);
    await client.query(sql4);
    console.log('✅ Migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();