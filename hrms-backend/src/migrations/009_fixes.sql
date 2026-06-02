-- 009_fixes.sql
-- Fixes for schema issues encountered during testing

-- 1. Add missing status column to onboarding_candidates (if it was created in an older schema version)
ALTER TABLE onboarding_candidates ADD COLUMN IF NOT EXISTS status onboard_status DEFAULT 'Pending Documents';

-- 2. Increase length of location column to avoid "value too long for type character varying(100)" when syncing attendance
ALTER TABLE attendance_records ALTER COLUMN location TYPE TEXT;
