-- 008_attendance_photo.sql

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS photo_url TEXT;
