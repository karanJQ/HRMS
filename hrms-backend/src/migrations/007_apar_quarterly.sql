-- 007_apar_quarterly.sql
-- Migration to update APAR to Quarterly Manager Reporting

-- 1. Drop existing constraints
ALTER TABLE apar_records DROP CONSTRAINT IF EXISTS apar_records_emp_id_financial_year_key;

-- 2. Rename financial_year to cycle_name
ALTER TABLE apar_records RENAME COLUMN financial_year TO cycle_name;
ALTER TABLE apar_records ALTER COLUMN cycle_name TYPE VARCHAR(50);

-- 3. Drop self-assessment columns
ALTER TABLE apar_records DROP COLUMN IF EXISTS self_grade;
ALTER TABLE apar_records DROP COLUMN IF EXISTS self_remarks;
ALTER TABLE apar_records DROP COLUMN IF EXISTS self_date;

-- 4. Add new constraints
ALTER TABLE apar_records ADD CONSTRAINT apar_records_emp_id_cycle_name_key UNIQUE (emp_id, cycle_name);

-- 5. Update status of any 'Pending Self-Assessment' to 'Pending Reporting Officer'
UPDATE apar_records SET status = 'Pending Reporting Officer' WHERE status = 'Pending Self-Assessment';
