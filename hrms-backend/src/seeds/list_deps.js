require('dotenv').config();
const { pool } = require('../config/database');

async function listTables() {
  const client = await pool.connect();
  try {
    const sql = `
      SELECT DISTINCT tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.table_constraints tc2 ON rc.unique_constraint_name = tc2.constraint_name
      WHERE tc2.table_name IN ('employees', 'users')
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `;
    const result = await client.query(sql);
    console.log('Tables referencing employees/users:');
    result.rows.forEach(r => console.log(' -', r.table_name));
  } finally {
    client.release();
    pool.end();
  }
}
listTables();
