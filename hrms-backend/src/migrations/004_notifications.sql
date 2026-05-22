-- 004_notifications.sql

-- ────────────────────────────────────────────────────────
-- NOTIFICATIONS (In-App Notification System)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,       -- 'TASK_ASSIGNED', 'TASK_DEADLINE', 'TASK_UPDATED', 'TASK_COMPLETED'
  title       VARCHAR(200) NOT NULL,
  message     TEXT,
  ref_id      INT,                        -- references task id
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
