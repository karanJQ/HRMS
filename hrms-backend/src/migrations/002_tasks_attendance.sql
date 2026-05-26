-- 002_tasks_attendance.sql

-- Task Status Enum
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('Todo', 'In Progress', 'In Review', 'Done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Task Priority Enum
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────
-- TASKS (Task Management & Workflow Automation)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  assigned_to     INT REFERENCES users(id),
  created_by      INT REFERENCES users(id),
  status          task_status DEFAULT 'Todo',
  priority        task_priority DEFAULT 'Medium',
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- ATTENDANCE RECORDS (Biometric System Sync)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
  id              SERIAL PRIMARY KEY,
  emp_id          VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  date            DATE NOT NULL,
  punch_in        TIME,
  punch_out       TIME,
  status          VARCHAR(30) DEFAULT 'Present',
  biometric_sync  BOOLEAN DEFAULT TRUE,
  location        VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(emp_id, date)
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_records(emp_id, date);
