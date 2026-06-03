-- 015_announcements.sql
-- Migration to add announcements table

CREATE TABLE IF NOT EXISTS announcements (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  type          VARCHAR(50) NOT NULL,
  content       TEXT NOT NULL,
  created_by    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster retrieval by date
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
