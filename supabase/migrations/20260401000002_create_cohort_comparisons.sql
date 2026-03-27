-- ============================================================
-- Cohort comparisons table
-- Stores cross-semester comparative analyses (immutable snapshots).
-- ============================================================

CREATE TABLE cohort_comparisons (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester_ids UUID[]      NOT NULL,
  analysis     JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cohort_comparisons_user_id_idx ON cohort_comparisons(user_id);

ALTER TABLE cohort_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cohort comparisons"
  ON cohort_comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cohort comparisons"
  ON cohort_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);
