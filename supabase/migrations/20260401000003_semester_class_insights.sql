-- ============================================================
-- Evolve class_insights to support per-semester + cross-semester rows.
-- Existing rows (semester_id = NULL) become the "global" cross-semester row.
-- ============================================================

ALTER TABLE class_insights
  ADD COLUMN semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS class_insights_user_id_idx;

-- Per-semester row: one insight per user per semester
CREATE UNIQUE INDEX class_insights_user_semester_idx
  ON class_insights(user_id, semester_id) WHERE semester_id IS NOT NULL;

-- Global row: one per user where semester_id IS NULL
CREATE UNIQUE INDEX class_insights_user_global_idx
  ON class_insights(user_id) WHERE semester_id IS NULL;
