
-- =========================================================
-- HRMS DATABASE MIGRATION
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin','hr_manager','dept_head','hr_staff','employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE emp_status AS ENUM ('Active','On Leave','Suspended','Retired','Resigned','Deceased');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('Male','Female','Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE category_type AS ENUM ('General','OBC','SC','ST','EWS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM ('CL','EL','ML','Maternity','Paternity','CCL','Study Leave','LWP','Compensatory');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM ('Pending','Approved','Rejected','Cancelled','Withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_type AS ENUM ('Admin Initiated','Request','Mutual','Promotion-Based','On Deputation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_status AS ENUM ('Pending Approval','Approved','Completed','Rejected','Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE apar_grade AS ENUM ('Outstanding','Very Good','Good','Average','Poor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE grievance_status AS ENUM ('Pending','Under Review','Resolved','Escalated','Closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE disc_status AS ENUM ('Inquiry Initiated','Inquiry Ongoing','Report Submitted','Order Issued','Appealed','Closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payroll_status AS ENUM ('Draft','Processed','Paid','Held','Revised');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE onboard_status AS ENUM ('Pending Documents','Documents Verified','Medical Pending','Police Verification Pending','Joining Formalities','Completed','Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────
-- DEPARTMENTS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL UNIQUE,
  code          VARCHAR(20) NOT NULL UNIQUE,
  description   TEXT,
  head_emp_id   VARCHAR(20),
  parent_dept_id INT REFERENCES departments(id),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- DESIGNATIONS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS designations (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  grade           VARCHAR(20),
  pay_level_min   INT,
  pay_level_max   INT,
  dept_id         INT REFERENCES departments(id),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- USERS (Authentication)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  emp_id          VARCHAR(20) UNIQUE,
  username        VARCHAR(80) NOT NULL UNIQUE,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'employee',
  dept_id         INT REFERENCES departments(id),
  is_active       BOOLEAN DEFAULT TRUE,
  must_change_pw  BOOLEAN DEFAULT FALSE,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- EMPLOYEES (Master)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                    SERIAL PRIMARY KEY,
  emp_id                VARCHAR(20) NOT NULL UNIQUE,
  first_name            VARCHAR(80) NOT NULL,
  last_name             VARCHAR(80) NOT NULL,
  father_name           VARCHAR(150),
  mother_name           VARCHAR(150),
  spouse_name           VARCHAR(150),
  gender                gender_type NOT NULL,
  dob                   DATE NOT NULL,
  mobile                VARCHAR(15) NOT NULL,
  alternate_mobile      VARCHAR(15),
  official_email        VARCHAR(150),
  personal_email        VARCHAR(150),
  aadhaar_number        VARCHAR(20),
  pan_number            VARCHAR(20),
  voter_id              VARCHAR(30),
  dept_id               INT NOT NULL REFERENCES departments(id),
  designation_id        INT REFERENCES designations(id),
  grade                 VARCHAR(20),
  pay_level             INT,
  pay_step              INT DEFAULT 1,
  basic_pay             NUMERIC(12,2),
  category              category_type NOT NULL DEFAULT 'General',
  religion              VARCHAR(50),
  caste                 VARCHAR(100),
  is_divyang            BOOLEAN DEFAULT FALSE,
  divyang_type          VARCHAR(100),
  divyang_percentage    INT,
  district              VARCHAR(100),
  posting_station       VARCHAR(200),
  present_address       TEXT,
  permanent_address     TEXT,
  blood_group           VARCHAR(10),
  qualification         VARCHAR(200),
  subject_specialization VARCHAR(200),
  experience_years      INT DEFAULT 0,
  doj                   DATE NOT NULL,
  dor                   DATE,
  account_number        VARCHAR(30),
  bank_name             VARCHAR(100),
  ifsc_code             VARCHAR(20),
  bank_branch           VARCHAR(150),
  pf_number             VARCHAR(30),
  nps_id                VARCHAR(30),
  nominee_name          VARCHAR(150),
  nominee_relation      VARCHAR(50),
  nominee_dob           DATE,
  emergency_contact_name    VARCHAR(150),
  emergency_contact_mobile  VARCHAR(15),
  profile_photo_url     TEXT,
  status                emp_status DEFAULT 'Active',
  created_by            INT REFERENCES users(id),
  updated_by            INT REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- PAYROLL RECORDS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_records (
  id                  SERIAL PRIMARY KEY,
  emp_id              VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  month               INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                INT NOT NULL,
  basic_pay           NUMERIC(12,2) NOT NULL DEFAULT 0,
  da_percentage       NUMERIC(5,2) DEFAULT 42,
  da_amount           NUMERIC(12,2) DEFAULT 0,
  hra_percentage      NUMERIC(5,2) DEFAULT 20,
  hra_amount          NUMERIC(12,2) DEFAULT 0,
  ta_amount           NUMERIC(12,2) DEFAULT 0,
  medical_allowance   NUMERIC(12,2) DEFAULT 0,
  special_allowance   NUMERIC(12,2) DEFAULT 0,
  other_allowances    NUMERIC(12,2) DEFAULT 0,
  gross_pay           NUMERIC(12,2) DEFAULT 0,
  pf_employee         NUMERIC(12,2) DEFAULT 0,
  pf_employer         NUMERIC(12,2) DEFAULT 0,
  professional_tax    NUMERIC(12,2) DEFAULT 200,
  tds                 NUMERIC(12,2) DEFAULT 0,
  other_deductions    NUMERIC(12,2) DEFAULT 0,
  total_deductions    NUMERIC(12,2) DEFAULT 0,
  net_pay             NUMERIC(12,2) DEFAULT 0,
  payment_date        DATE,
  payment_mode        VARCHAR(30) DEFAULT 'Bank Transfer',
  bank_reference      VARCHAR(60),
  status              payroll_status DEFAULT 'Draft',
  remarks             TEXT,
  processed_by        INT REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(emp_id, month, year)
);

-- ────────────────────────────────────────────────────────
-- LEAVE BALANCES
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
  id            SERIAL PRIMARY KEY,
  emp_id        VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  year          INT NOT NULL,
  cl_entitled   INT DEFAULT 12,
  cl_used       INT DEFAULT 0,
  el_entitled   INT DEFAULT 30,
  el_used       INT DEFAULT 0,
  ml_entitled   INT DEFAULT 30,
  ml_used       INT DEFAULT 0,
  ccl_entitled  INT DEFAULT 0,
  ccl_used      INT DEFAULT 0,
  sl_entitled   INT DEFAULT 0,
  sl_used       INT DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(emp_id, year)
);

-- ────────────────────────────────────────────────────────
-- LEAVE APPLICATIONS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_applications (
  id                    SERIAL PRIMARY KEY,
  emp_id                VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  leave_type            leave_type NOT NULL,
  from_date             DATE NOT NULL,
  to_date               DATE NOT NULL,
  days                  INT NOT NULL,
  reason                TEXT NOT NULL,
  status                leave_status DEFAULT 'Pending',
  applied_date          DATE DEFAULT CURRENT_DATE,
  reviewed_by           INT REFERENCES users(id),
  reviewed_date         TIMESTAMPTZ,
  remarks               TEXT,
  medical_certificate   TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- TRANSFERS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfers (
  id              SERIAL PRIMARY KEY,
  emp_id          VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  from_district   VARCHAR(100),
  to_district     VARCHAR(100),
  from_station    VARCHAR(200),
  to_station      VARCHAR(200),
  transfer_type   transfer_type DEFAULT 'Admin Initiated',
  request_date    DATE,
  order_date      DATE,
  order_number    VARCHAR(60),
  effective_date  DATE,
  reason          TEXT,
  status          transfer_status DEFAULT 'Pending Approval',
  initiated_by    INT REFERENCES users(id),
  approved_by     INT REFERENCES users(id),
  remarks         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- PROMOTIONS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id                    SERIAL PRIMARY KEY,
  emp_id                VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  from_designation_id   INT REFERENCES designations(id),
  to_designation_id     INT REFERENCES designations(id),
  from_designation_name VARCHAR(150),
  to_designation_name   VARCHAR(150),
  from_pay_level        INT,
  to_pay_level          INT,
  dpc_meeting_date      DATE,
  effective_date        DATE,
  order_number          VARCHAR(60),
  basis                 VARCHAR(100),
  remarks               TEXT,
  status                VARCHAR(50) DEFAULT 'Pending DPC',
  approved_by           INT REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- APAR RECORDS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apar_records (
  id                        SERIAL PRIMARY KEY,
  emp_id                    VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  financial_year            VARCHAR(10) NOT NULL,
  self_grade                apar_grade,
  self_remarks              TEXT,
  self_date                 DATE,
  reporting_officer_id      INT REFERENCES users(id),
  reporting_grade           apar_grade,
  reporting_remarks         TEXT,
  reporting_date            DATE,
  reviewing_officer_id      INT REFERENCES users(id),
  reviewing_grade           apar_grade,
  reviewing_remarks         TEXT,
  reviewing_date            DATE,
  final_grade               apar_grade,
  final_remarks             TEXT,
  status                    VARCHAR(60) DEFAULT 'Pending Self-Assessment',
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(emp_id, financial_year)
);

-- ────────────────────────────────────────────────────────
-- SERVICE BOOK ENTRIES
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_book_entries (
  id              SERIAL PRIMARY KEY,
  emp_id          VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  event_date      DATE NOT NULL,
  event_type      VARCHAR(50) NOT NULL,
  details         TEXT NOT NULL,
  order_number    VARCHAR(60),
  recorded_by     INT REFERENCES users(id),
  recorded_by_name VARCHAR(150),
  is_verified     BOOLEAN DEFAULT FALSE,
  blockchain_hash VARCHAR(200),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- TRAINING PROGRAMS
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_programs (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(200) NOT NULL,
  dept_id         INT REFERENCES departments(id),
  description     TEXT,
  start_date      DATE,
  end_date        DATE,
  venue           VARCHAR(200),
  capacity        INT DEFAULT 30,
  training_type   VARCHAR(80),
  provider_name   VARCHAR(150),
  fee_per_person  NUMERIC(10,2) DEFAULT 0,
  is_mandatory    BOOLEAN DEFAULT FALSE,
  status          VARCHAR(30) DEFAULT 'Upcoming',
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_enrollments (
  id                SERIAL PRIMARY KEY,
  program_id        INT NOT NULL REFERENCES training_programs(id),
  emp_id            VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  enrollment_date   DATE DEFAULT CURRENT_DATE,
  attendance_status VARCHAR(30) DEFAULT 'Enrolled',
  certificate_no    VARCHAR(60),
  certificate_date  DATE,
  feedback_rating   INT CHECK (feedback_rating BETWEEN 1 AND 5),
  remarks           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, emp_id)
);

-- ────────────────────────────────────────────────────────
-- RETIREMENT TRACKING
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retirement_tracking (
  id                          SERIAL PRIMARY KEY,
  emp_id                      VARCHAR(20) NOT NULL UNIQUE REFERENCES employees(emp_id),
  retirement_date             DATE,
  notice_sent_1yr             BOOLEAN DEFAULT FALSE,
  notice_sent_6mo             BOOLEAN DEFAULT FALSE,
  noc_cleared                 BOOLEAN DEFAULT FALSE,
  handover_completed          BOOLEAN DEFAULT FALSE,
  pension_submitted           BOOLEAN DEFAULT FALSE,
  gpf_settled                 BOOLEAN DEFAULT FALSE,
  medical_certificate         BOOLEAN DEFAULT FALSE,
  id_returned                 BOOLEAN DEFAULT FALSE,
  gratuity_amount             NUMERIC(15,2),
  gpf_final_amount            NUMERIC(15,2),
  pension_type                VARCHAR(30) DEFAULT 'NPS',
  pension_order_number        VARCHAR(60),
  retirement_order_generated  BOOLEAN DEFAULT FALSE,
  remarks                     TEXT,
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- GRIEVANCES
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grievances (
  id                  SERIAL PRIMARY KEY,
  emp_id              VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  grievance_type      VARCHAR(80) NOT NULL,
  subject             VARCHAR(300) NOT NULL,
  description         TEXT,
  priority            VARCHAR(20) DEFAULT 'Medium',
  submission_date     DATE DEFAULT CURRENT_DATE,
  assigned_to         INT REFERENCES users(id),
  assigned_date       DATE,
  status              grievance_status DEFAULT 'Pending',
  resolution_remarks  TEXT,
  resolution_date     DATE,
  is_escalated        BOOLEAN DEFAULT FALSE,
  escalation_level    INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- DISCIPLINARY CASES
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disciplinary_cases (
  id                    SERIAL PRIMARY KEY,
  emp_id                VARCHAR(20) NOT NULL REFERENCES employees(emp_id),
  charge_sheet_number   VARCHAR(60),
  charge_description    TEXT NOT NULL,
  incident_date         DATE,
  case_start_date       DATE,
  inquiry_officer_id    INT REFERENCES users(id),
  inquiry_officer_name  VARCHAR(150),
  status                disc_status DEFAULT 'Inquiry Initiated',
  hearing_dates         TEXT,
  inquiry_report_date   DATE,
  penalty_type          VARCHAR(100),
  penalty_order_number  VARCHAR(60),
  penalty_date          DATE,
  appeal_filed          BOOLEAN DEFAULT FALSE,
  appeal_status         VARCHAR(50),
  remarks               TEXT,
  created_by            INT REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- ONBOARDING
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_candidates (
  id                          SERIAL PRIMARY KEY,
  candidate_ref_id            VARCHAR(60),
  name                        VARCHAR(200) NOT NULL,
  post                        VARCHAR(150) NOT NULL,
  dept_id                     INT REFERENCES departments(id),
  dept_name                   VARCHAR(150),
  selection_date              DATE,
  joining_date                DATE,
  documents_submitted         BOOLEAN DEFAULT FALSE,
  medical_cleared             BOOLEAN DEFAULT FALSE,
  police_verification         VARCHAR(30) DEFAULT 'Pending',
  appointment_letter_sent     BOOLEAN DEFAULT FALSE,
  service_book_created        BOOLEAN DEFAULT FALSE,
  emp_id_assigned             VARCHAR(20),
  status                      onboard_status DEFAULT 'Pending Documents',
  remarks                     TEXT,
  created_by                  INT REFERENCES users(id),
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- AUDIT LOG
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id),
  action      VARCHAR(100),
  entity      VARCHAR(80),
  entity_id   VARCHAR(40),
  details     JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(dept_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_month ON payroll_records(emp_id, year, month);
CREATE INDEX IF NOT EXISTS idx_leave_emp ON leave_applications(emp_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_transfers_emp ON transfers(emp_id);
CREATE INDEX IF NOT EXISTS idx_apar_emp ON apar_records(emp_id);
CREATE INDEX IF NOT EXISTS idx_sb_emp ON service_book_entries(emp_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
