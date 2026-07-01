CREATE TABLE IF NOT EXISTS resignations (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  reason TEXT NOT NULL,
  submission_date DATE DEFAULT CURRENT_DATE,
  desired_last_date DATE NOT NULL,
  notice_period_days INT DEFAULT 60,
  status VARCHAR(30) DEFAULT 'Pending',
  actual_last_date DATE,
  hr_remarks TEXT,
  noc_cleared BOOLEAN DEFAULT FALSE,
  leaves_taken_during_notice INT DEFAULT 0,
  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resignations_emp ON resignations(emp_id);
CREATE INDEX IF NOT EXISTS idx_resignations_status ON resignations(status);
