const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const fs = require('fs');
const { pool } = require('../config/database');

async function runMigration() {
  const client = await pool.connect();
  try {
    const files = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`Running migration: ${file}...`);
      const sqlFilePath = path.join(__dirname, file);
      const sql = fs.readFileSync(sqlFilePath, 'utf8');
      await client.query(sql);
    }
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