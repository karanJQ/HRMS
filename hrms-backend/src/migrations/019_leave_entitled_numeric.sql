-- 019_leave_entitled_numeric.sql

-- Alter leave_balances to support fractional entitled leaves (e.g., 0.5 SL)
ALTER TABLE leave_balances 
  ALTER COLUMN el_entitled TYPE NUMERIC(5,1) USING el_entitled::NUMERIC(5,1),
  ALTER COLUMN sl_entitled TYPE NUMERIC(5,1) USING sl_entitled::NUMERIC(5,1);
