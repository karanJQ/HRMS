-- 020_reporting_manager.sql

ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id VARCHAR(20) REFERENCES employees(emp_id) ON DELETE SET NULL;
