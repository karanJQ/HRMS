-- Alter leave_balances to set all default entitled leaves to 0
ALTER TABLE leave_balances ALTER COLUMN cl_entitled SET DEFAULT 0;
ALTER TABLE leave_balances ALTER COLUMN el_entitled SET DEFAULT 0;
ALTER TABLE leave_balances ALTER COLUMN ml_entitled SET DEFAULT 0;
ALTER TABLE leave_balances ALTER COLUMN ccl_entitled SET DEFAULT 0;
ALTER TABLE leave_balances ALTER COLUMN sl_entitled SET DEFAULT 0;

-- Optional: For existing records where they were given the exact default and NO leaves were used, we might reset them to 0.
-- But to be safe, we just change the schema default for new inserts.
