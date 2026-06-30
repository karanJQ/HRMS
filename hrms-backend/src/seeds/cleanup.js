require('dotenv').config();
const { pool } = require('../config/database');

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🧹 Cleaning up old seeded data...');

    // Delete in FK-safe order (children before parents)
    await client.query('DELETE FROM audit_logs');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM announcements');
    await client.query('DELETE FROM employee_documents');
    await client.query('DELETE FROM onboarding_candidates');
    await client.query('DELETE FROM disciplinary_cases');
    await client.query('DELETE FROM grievances');
    await client.query('DELETE FROM kpi_approvals');
    await client.query('DELETE FROM kpi_reports');
    await client.query('DELETE FROM kpi_cycles');
    await client.query('DELETE FROM tasks');
    await client.query('DELETE FROM wfh_requests');
    await client.query('DELETE FROM overtime_records');
    await client.query('DELETE FROM regularization_requests');
    await client.query('DELETE FROM attendance_records');
    await client.query('DELETE FROM probation_reviews');
    await client.query('DELETE FROM training_enrollments');
    await client.query('DELETE FROM training_programs');
    await client.query('DELETE FROM apar_records');
    await client.query('DELETE FROM promotions');
    await client.query('DELETE FROM transfers');
    await client.query('DELETE FROM leave_applications');
    await client.query('DELETE FROM leave_balances');
    await client.query('DELETE FROM retirement_tracking');
    await client.query('DELETE FROM service_book_entries');
    await client.query('DELETE FROM payroll_records');
    await client.query('DELETE FROM employees');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM designations');
    await client.query('DELETE FROM departments');

    await client.query('COMMIT');
    console.log('✅ All data cleared!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

cleanup();
