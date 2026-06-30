require('dotenv').config();
const { pool } = require('../config/database');

async function alterTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS uan_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS esic_number VARCHAR(20);
    `);
    console.log('Columns added successfully');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    client.release();
    pool.end();
  }
}

alterTable();
