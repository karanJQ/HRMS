const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { pool } = require('./src/config/database');

async function runMigration() {
  const sqlFile = path.join(__dirname, 'src/migrations/013_leave_types.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Leave Migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
