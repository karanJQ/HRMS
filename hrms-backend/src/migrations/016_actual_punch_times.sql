-- 016_actual_punch_times.sql

-- Add columns to track the actual physical punch times before any regularization overrides them
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS actual_punch_in TIME;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS actual_punch_out TIME;

-- For existing records that are NOT regularized, populate actual_punch_* with the existing punch_*
UPDATE attendance_records 
SET actual_punch_in = punch_in, actual_punch_out = punch_out
WHERE is_regularized = FALSE;
