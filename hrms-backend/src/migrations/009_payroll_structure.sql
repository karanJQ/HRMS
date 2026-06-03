ALTER TABLE employees ADD COLUMN IF NOT EXISTS ctc NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS ctc NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS esic_employer NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS esic_employee NUMERIC(12,2) DEFAULT 0;

-- Optionally, populate CTC for existing employees based on basic_pay to prevent 0s, using the reverse formula.
-- Let's just set CTC to basic_pay * 2 (as an approximation) if basic_pay exists.
UPDATE employees SET ctc = basic_pay * 2 WHERE ctc = 0 AND basic_pay IS NOT NULL;
