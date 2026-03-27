-- ============================================================
-- Add optional semester_id FK to sessions.
-- Existing sessions remain NULL (unassigned) until professor assigns them.
-- ============================================================

ALTER TABLE sessions
  ADD COLUMN semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL;

CREATE INDEX sessions_semester_id_idx ON sessions(semester_id);
CREATE INDEX sessions_user_semester_date_idx ON sessions(user_id, semester_id, created_at DESC);
