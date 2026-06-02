-- 012_probation_fields.sql
-- Add probation fields to employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS probation_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS probation_end_date DATE,
ADD COLUMN IF NOT EXISTS probation_status VARCHAR(20) DEFAULT 'Pending';

-- Create table to track probation review actions (Audit Trail)
CREATE TABLE IF NOT EXISTS probation_reviews (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(20) REFERENCES employees(emp_id),
  action VARCHAR(20) NOT NULL, -- 'Accepted', 'Rejected', 'Extended'
  extension_days INT DEFAULT 0,
  notes TEXT,
  reviewed_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill probation_end_date for existing employees who don't have it
UPDATE employees
SET probation_end_date = doj + (probation_days * interval '1 day')
WHERE probation_end_date IS NULL;
