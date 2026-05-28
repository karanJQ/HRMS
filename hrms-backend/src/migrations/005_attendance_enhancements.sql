-- 005_attendance_enhancements.sql
-- Adds: half-day leave support, WFH requests, overtime tracking, enhanced settings

-- 1. Add half_day_type to leave_applications
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS half_day_type VARCHAR(20);
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS contact_number VARCHAR(15);
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS leave_address TEXT;

-- 2. Create WFH requests table
CREATE TABLE IF NOT EXISTS wfh_requests (
  id              SERIAL PRIMARY KEY,
  emp_id          VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  date            DATE NOT NULL,
  reason          TEXT NOT NULL,
  status          VARCHAR(30) DEFAULT 'Pending',
  reviewed_by     INT REFERENCES users(id),
  reviewed_date   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(emp_id, date)
);

-- 3. Create overtime records table
CREATE TABLE IF NOT EXISTS overtime_records (
  id              SERIAL PRIMARY KEY,
  emp_id          VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  date            DATE NOT NULL,
  hours           NUMERIC(4,1) NOT NULL DEFAULT 0,
  rate_multiplier NUMERIC(3,1) DEFAULT 1.5,
  amount          NUMERIC(10,2) DEFAULT 0,
  approved_by     INT REFERENCES users(id),
  status          VARCHAR(30) DEFAULT 'Pending',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add overtime settings to attendance_settings
ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS ot_rate_weekday NUMERIC(3,1) DEFAULT 1.5;
ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS ot_rate_weekend NUMERIC(3,1) DEFAULT 2.0;
ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS ot_rate_holiday NUMERIC(3,1) DEFAULT 2.5;
ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS working_days VARCHAR(30) DEFAULT 'Monday-Friday';
ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS half_day_cutoff TIME DEFAULT '14:00:00';
ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS auto_absent_minutes INT DEFAULT 480;
ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS enable_overtime BOOLEAN DEFAULT FALSE;

-- 5. Add is_regularized and working_hours to attendance_records
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_regularized BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS working_hours NUMERIC(4,1);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS ot_hours NUMERIC(4,1) DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'biometric';

-- 6. Add half_day_type to regularization_requests
ALTER TABLE regularization_requests ADD COLUMN IF NOT EXISTS half_day_type VARCHAR(20);
ALTER TABLE regularization_requests ADD COLUMN IF NOT EXISTS regularization_type VARCHAR(30) DEFAULT 'full_day';

-- 7. Create a view for monthly attendance summary
CREATE OR REPLACE VIEW attendance_summary AS
SELECT
  emp_id,
  EXTRACT(YEAR FROM date) AS year,
  EXTRACT(MONTH FROM date) AS month,
  COUNT(*) FILTER (WHERE status = 'Present') AS present_days,
  COUNT(*) FILTER (WHERE status = 'Absent') AS absent_days,
  COUNT(*) FILTER (WHERE status = 'Half Day') AS half_days,
  COUNT(*) FILTER (WHERE status = 'Late') AS late_days,
  COUNT(*) FILTER (WHERE status = 'WFH') AS wfh_days,
  COUNT(*) FILTER (WHERE biometric_sync = true) AS biometric_days,
  SUM(working_hours) AS total_working_hours,
  SUM(ot_hours) AS total_ot_hours
FROM attendance_records
GROUP BY emp_id, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date);

-- 8. Support half-day (0.5) in leave_applications.days
ALTER TABLE leave_applications ALTER COLUMN days TYPE NUMERIC(3,1) USING days::NUMERIC(3,1);

-- 9. Create index for calendar queries
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date_status ON attendance_records(emp_id, date, status);
CREATE INDEX IF NOT EXISTS idx_wfh_emp_date ON wfh_requests(emp_id, date);
CREATE INDEX IF NOT EXISTS idx_overtime_emp_date ON overtime_records(emp_id, date);

-- 10. Add sample holidays for current year if table is empty
INSERT INTO holidays (date, name, type)
SELECT d, n, t FROM (VALUES
  ('2026-01-26'::DATE, 'Republic Day', 'National'),
  ('2026-03-14'::DATE, 'Holi', 'Festival'),
  ('2026-03-31'::DATE, 'Eid-ul-Fitr', 'Festival'),
  ('2026-04-14'::DATE, 'Ambedkar Jayanti', 'National'),
  ('2026-08-15'::DATE, 'Independence Day', 'National'),
  ('2026-10-02'::DATE, 'Gandhi Jayanti', 'National'),
  ('2026-11-01'::DATE, 'Diwali', 'Festival'),
  ('2026-11-14'::DATE, 'Guru Nanak Jayanti', 'Festival'),
  ('2026-12-25'::DATE, 'Christmas', 'Festival')
) AS v(d, n, t)
WHERE NOT EXISTS (SELECT 1 FROM holidays LIMIT 1);
