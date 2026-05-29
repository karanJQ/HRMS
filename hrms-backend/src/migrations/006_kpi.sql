-- 006_kpi.sql
-- KPI Management System with tree-based approval workflow
-- Quarterly KPI cycles, report items (sum to 100%), and multi-stage approvals

-- ─── KPI Cycles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_cycles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,           -- e.g. "Q1-2026"
  quarter     INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year        INT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quarter, year)
);

-- ─── KPI Reports ─────────────────────────────────────────────────────────────
-- One report per employee per cycle, filled by their manager
CREATE TABLE IF NOT EXISTS kpi_reports (
  id              SERIAL PRIMARY KEY,
  cycle_id        INT NOT NULL REFERENCES kpi_cycles(id),
  emp_id          VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  manager_id      INT NOT NULL REFERENCES users(id),   -- who filled the report
  overall_score   NUMERIC(5,2) DEFAULT 0,              -- weighted final score (0-100)
  manager_remarks TEXT,
  ai_insights     JSONB,                               -- cached AI response
  status          VARCHAR(40) NOT NULL DEFAULT 'Draft',
  -- Possible statuses: Draft | Submitted | CPO/COO Review | MD Review | Approved | Published | Returned
  submitted_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, emp_id)
);

-- ─── KPI Items ───────────────────────────────────────────────────────────────
-- Individual KPI line items within a report; weightages must sum to 100
CREATE TABLE IF NOT EXISTS kpi_items (
  id              SERIAL PRIMARY KEY,
  report_id       INT NOT NULL REFERENCES kpi_reports(id) ON DELETE CASCADE,
  item_name       VARCHAR(200) NOT NULL,
  description     TEXT,
  weightage       NUMERIC(5,2) NOT NULL DEFAULT 0,   -- % weight (e.g. 25.00)
  target          VARCHAR(300),                       -- target description
  score           NUMERIC(5,2) DEFAULT 0,             -- actual score 0-100
  weighted_score  NUMERIC(5,2) GENERATED ALWAYS AS (weightage * score / 100) STORED,
  manager_remarks TEXT,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── KPI Approvals ───────────────────────────────────────────────────────────
-- Tree-based approval chain: one row per stage (cpo, coo, md)
-- Mirrors the leave_routing pattern for the fork diagram
CREATE TABLE IF NOT EXISTS kpi_approvals (
  id              SERIAL PRIMARY KEY,
  report_id       INT NOT NULL REFERENCES kpi_reports(id) ON DELETE CASCADE,
  approver_role   VARCHAR(20) NOT NULL CHECK (approver_role IN ('cpo','coo','md')),
  approver_id     INT REFERENCES users(id),           -- set when acted upon
  status          VARCHAR(20) NOT NULL DEFAULT 'Pending',
  -- Pending | Approved | Returned
  remarks         TEXT,
  acted_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, approver_role)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kpi_reports_cycle    ON kpi_reports(cycle_id);
CREATE INDEX IF NOT EXISTS idx_kpi_reports_emp      ON kpi_reports(emp_id);
CREATE INDEX IF NOT EXISTS idx_kpi_reports_status   ON kpi_reports(status);
CREATE INDEX IF NOT EXISTS idx_kpi_items_report     ON kpi_items(report_id);
CREATE INDEX IF NOT EXISTS idx_kpi_approvals_report ON kpi_approvals(report_id);
CREATE INDEX IF NOT EXISTS idx_kpi_approvals_role   ON kpi_approvals(approver_role, status);

-- ─── Seed default active cycle ───────────────────────────────────────────────
INSERT INTO kpi_cycles (name, quarter, year, start_date, end_date, is_active)
VALUES ('Q2-2026', 2, 2026, '2026-04-01', '2026-06-30', TRUE)
ON CONFLICT (quarter, year) DO NOTHING;
