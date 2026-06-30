require('dotenv').config();
const { pool } = require('../config/database');

async function cleanDuplicates() {
  const client = await pool.connect();
  try {
    await client.query(`
      DELETE FROM service_book_entries
      WHERE id IN (
        SELECT id
        FROM (
          SELECT id,
                 ROW_NUMBER() OVER (partition BY emp_id, event_type, details ORDER BY id) AS rnum
          FROM service_book_entries
        ) t
        WHERE t.rnum > 1
      );
    `);
    console.log('Duplicate entries removed.');
  } catch (err) {
    console.error('Error cleaning duplicates:', err);
  } finally {
    client.release();
    pool.end();
  }
}

cleanDuplicates();
