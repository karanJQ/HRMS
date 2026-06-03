const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const fs = require('fs');
const { pool } = require('../config/database');

async function runMigration() {
  const sqlFile = path.join(__dirname, '015_announcements.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Migration 015 completed successfully');
  } catch (err) {
    console.error('❌ Migration 015 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
