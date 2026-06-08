-- 008_conflict_cancel.sql
-- Adds half_day_type support to WFH requests and relaxes unique constraint

-- 1. Add half_day_type and wfh_type to wfh_requests
ALTER TABLE wfh_requests ADD COLUMN IF NOT EXISTS half_day_type VARCHAR(20);
ALTER TABLE wfh_requests ADD COLUMN IF NOT EXISTS wfh_type VARCHAR(20) DEFAULT 'full_day';

-- 2. Drop the old unique constraint so two half-day WFH can exist on same date
ALTER TABLE wfh_requests DROP CONSTRAINT IF EXISTS wfh_requests_emp_id_date_key;

-- 3. Add cancelled_by and cancel_reason columns for audit trail
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS cancelled_by INT REFERENCES users(id);
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE wfh_requests ADD COLUMN IF NOT EXISTS cancelled_by INT REFERENCES users(id);
ALTER TABLE wfh_requests ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE regularization_requests ADD COLUMN IF NOT EXISTS cancelled_by INT REFERENCES users(id);
ALTER TABLE regularization_requests ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
