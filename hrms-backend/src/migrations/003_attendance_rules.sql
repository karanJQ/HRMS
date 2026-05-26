-- 003_attendance_rules.sql

-- 1. Alter leave_type enum to include WFH and Outdoor Duty
-- Postgres doesn't allow IF NOT EXISTS for ADD VALUE directly in older versions without PL/pgSQL
DO $$ BEGIN
  ALTER TYPE leave_type ADD VALUE 'WFH';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE leave_type ADD VALUE 'Outdoor Duty';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Regularization Requests Table
CREATE TABLE IF NOT EXISTS regularization_requests (
  id              SERIAL PRIMARY KEY,
  emp_id          VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  date            DATE NOT NULL,
  requested_in    TIME,
  requested_out   TIME,
  reason          TEXT NOT NULL,
  status          VARCHAR(30) DEFAULT 'Pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attendance Settings Table (Shift config)
CREATE TABLE IF NOT EXISTS attendance_settings (
  id                  SERIAL PRIMARY KEY,
  shift_start         TIME DEFAULT '09:00:00',
  shift_end           TIME DEFAULT '18:00:00',
  grace_period_mins   INT DEFAULT 30,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO attendance_settings (shift_start, shift_end, grace_period_mins)
SELECT '09:00:00', '18:00:00', 30
WHERE NOT EXISTS (SELECT 1 FROM attendance_settings);

-- 4. Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  type        VARCHAR(30) DEFAULT 'Festival' -- e.g., 'Festival', 'Weekend'
);
