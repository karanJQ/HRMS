require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration() {
  const sqlFile1 = path.join(__dirname, '001_schema.sql');
  const sqlFile2 = path.join(__dirname, '002_tasks_attendance.sql');
  const sqlFile3 = path.join(__dirname, '003_attendance_rules.sql');
  const sqlFile4 = path.join(__dirname, '004_notifications.sql');
  const sqlFile5 = path.join(__dirname, '005_attendance_enhancements.sql');
  const sqlFile6 = path.join(__dirname, '006_kpi.sql');
  const sqlFile7 = path.join(__dirname, '007_apar_quarterly.sql');
  const sqlFile8 = path.join(__dirname, '008_attendance_photo.sql');
  const sql1 = fs.readFileSync(sqlFile1, 'utf8');
  const sql2 = fs.readFileSync(sqlFile2, 'utf8');
  const sql3 = fs.readFileSync(sqlFile3, 'utf8');
  const sql4 = fs.readFileSync(sqlFile4, 'utf8');
  const sql5 = fs.readFileSync(sqlFile5, 'utf8');
  const sql6 = fs.readFileSync(sqlFile6, 'utf8');
  const sql7 = fs.readFileSync(sqlFile7, 'utf8');
  const sql8 = fs.readFileSync(sqlFile8, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql1);
    await client.query(sql2);
    await client.query(sql3);
    await client.query(sql4);
    await client.query(sql5);
    await client.query(sql6);
    await client.query(sql7);
    await client.query(sql8);
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