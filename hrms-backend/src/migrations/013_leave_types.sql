-- 013_leave_types.sql

-- Add SL and DL to leave_type enum if they don't exist
DO $$ BEGIN
  ALTER TYPE leave_type ADD VALUE 'SL';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE leave_type ADD VALUE 'DL';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Alter leave_balances to support DL and change _used to NUMERIC for half days
ALTER TABLE leave_balances 
  ADD COLUMN IF NOT EXISTS dl_entitled INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dl_used NUMERIC(4,1) DEFAULT 0,
  ALTER COLUMN cl_used TYPE NUMERIC(4,1) USING cl_used::NUMERIC(4,1),
  ALTER COLUMN el_used TYPE NUMERIC(4,1) USING el_used::NUMERIC(4,1),
  ALTER COLUMN ml_used TYPE NUMERIC(4,1) USING ml_used::NUMERIC(4,1),
  ALTER COLUMN sl_used TYPE NUMERIC(4,1) USING sl_used::NUMERIC(4,1);
