-- 022_yearly_kpi_kra.sql
-- Yearly KPI & KRA System
-- Replaces quarterly KPI with a full annual goal-setting → self-assessment → multi-stage review workflow

-- ─── Employee Type ────────────────────────────────────────────────────────────
-- Used to determine approval routing (dev/tester/designer/sales_lead → CPO; salesperson → Sales Lead)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employee_type VARCHAR(30) NOT NULL DEFAULT 'other'
  CHECK (employee_type IN ('developer','tester','designer','sales_lead','salesperson','other'));

-- ─── Yearly KPI Cycles ───────────────────────────────────────────────────────
-- One cycle per calendar year
CREATE TABLE IF NOT EXISTS kpi_yearly_cycles (
  id                        SERIAL PRIMARY KEY,
  year                      INT NOT NULL UNIQUE,
  name                      VARCHAR(100) NOT NULL,          -- e.g. "FY 2026-27"
  start_date                DATE NOT NULL,                  -- cycle start (Jan 1 or Apr 1)
  end_date                  DATE NOT NULL,                  -- cycle end (Dec 31 or Mar 31)
  goal_deadline             DATE,                           -- last date to set & finalize goals
  self_assessment_deadline  DATE,                           -- last date for self-assessment
  is_active                 BOOLEAN DEFAULT TRUE,
  created_by                INT REFERENCES users(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Yearly KPI Reports ───────────────────────────────────────────────────────
-- One report per employee per cycle; tracks the full lifecycle
CREATE TABLE IF NOT EXISTS kpi_yearly_reports (
  id                    SERIAL PRIMARY KEY,
  cycle_id              INT NOT NULL REFERENCES kpi_yearly_cycles(id),
  emp_id                VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  reporting_manager_id  INT NOT NULL REFERENCES users(id),      -- who set the goals / reviews
  goals_frozen          BOOLEAN DEFAULT FALSE,                   -- locked after finalization
  overall_self_score    NUMERIC(5,2) DEFAULT 0,                  -- weighted self-assessment score
  overall_manager_score NUMERIC(5,2) DEFAULT 0,                  -- weighted manager score
  overall_score         NUMERIC(5,2) DEFAULT 0,                  -- final score used for KRA
  employee_remarks      TEXT,                                    -- employee's overall self remarks
  manager_remarks       TEXT,                                    -- reporting manager overall remarks
  cpo_remarks           TEXT,
  md_remarks            TEXT,
  ai_insights           JSONB,
  -- Status flow:
  -- Draft → Goals Set → Self Assessment Open → Submitted → Manager Review →
  -- CPO Review → MD Review → Approved → Published → Returned
  status                VARCHAR(40) NOT NULL DEFAULT 'Draft',
  goals_set_at          TIMESTAMPTZ,
  self_submitted_at     TIMESTAMPTZ,
  manager_reviewed_at   TIMESTAMPTZ,
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, emp_id)
);

-- ─── Yearly KPI Items ─────────────────────────────────────────────────────────
-- Individual KPI line items; weightages must sum to 100
CREATE TABLE IF NOT EXISTS kpi_yearly_items (
  id                    SERIAL PRIMARY KEY,
  report_id             INT NOT NULL REFERENCES kpi_yearly_reports(id) ON DELETE CASCADE,
  item_name             VARCHAR(200) NOT NULL,
  description           TEXT,
  weightage             NUMERIC(5,2) NOT NULL DEFAULT 0,         -- % weight (sum must = 100)
  target                VARCHAR(500),                            -- agreed target/milestone
  self_score            NUMERIC(5,2) DEFAULT NULL,               -- filled by employee
  manager_score         NUMERIC(5,2) DEFAULT NULL,               -- filled by reporting manager
  self_remarks          TEXT,
  manager_item_remarks  TEXT,
  sort_order            INT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Yearly KPI Approvals ─────────────────────────────────────────────────────
-- One row per stage per report; stages driven by employee_type
CREATE TABLE IF NOT EXISTS kpi_yearly_approvals (
  id              SERIAL PRIMARY KEY,
  report_id       INT NOT NULL REFERENCES kpi_yearly_reports(id) ON DELETE CASCADE,
  -- approver_role values:
  --   'reporting_manager' | 'cpo' (hr_manager) | 'sales_lead' (designation) | 'md' (super_admin)
  approver_role   VARCHAR(30) NOT NULL,
  approver_id     INT REFERENCES users(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'Waiting',
  -- Waiting | Pending | Approved | Returned
  remarks         TEXT,
  acted_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, approver_role)
);

-- ─── KRA Discussions ─────────────────────────────────────────────────────────
-- Post-publish: CPO + MD (or Sales Lead + MD) record increment decision
CREATE TABLE IF NOT EXISTS kra_discussions (
  id                    SERIAL PRIMARY KEY,
  report_id             INT NOT NULL REFERENCES kpi_yearly_reports(id) ON DELETE CASCADE,
  year                  INT NOT NULL,
  emp_id                VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  discussed_by_cpo_id   INT REFERENCES users(id),       -- CPO or Sales Lead who participated
  discussed_by_md_id    INT REFERENCES users(id),        -- MD
  increment_percentage  NUMERIC(6,3) DEFAULT 0,          -- e.g. 12.5%
  increment_amount      NUMERIC(12,2) DEFAULT 0,         -- actual rupee amount
  new_grade             VARCHAR(20),
  new_designation       VARCHAR(150),
  kra_score             NUMERIC(5,2),                    -- KRA discussion-assigned score
  discussion_notes      TEXT,                            -- detailed notes from the discussion
  decided_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kpi_yr_reports_cycle   ON kpi_yearly_reports(cycle_id);
CREATE INDEX IF NOT EXISTS idx_kpi_yr_reports_emp     ON kpi_yearly_reports(emp_id);
CREATE INDEX IF NOT EXISTS idx_kpi_yr_reports_mgr     ON kpi_yearly_reports(reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_kpi_yr_reports_status  ON kpi_yearly_reports(status);
CREATE INDEX IF NOT EXISTS idx_kpi_yr_items_report    ON kpi_yearly_items(report_id);
CREATE INDEX IF NOT EXISTS idx_kpi_yr_approvals_rpt   ON kpi_yearly_approvals(report_id);
CREATE INDEX IF NOT EXISTS idx_kra_discussions_emp    ON kra_discussions(emp_id, year);

-- ─── Seed active cycle for current year ─────────────────────────────────────
INSERT INTO kpi_yearly_cycles (year, name, start_date, end_date, goal_deadline, self_assessment_deadline, is_active)
VALUES (
  2026,
  'FY 2026-27',
  '2026-04-01',
  '2027-03-31',
  '2026-06-30',
  '2027-02-28',
  TRUE
)
ON CONFLICT (year) DO NOTHING;
