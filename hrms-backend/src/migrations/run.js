require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration() {
  const sqlFile = path.join(__dirname, '001_schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
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