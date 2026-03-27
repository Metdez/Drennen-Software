-- ============================================================
-- Semester reports: stored AI-generated end-of-semester reports
-- One report per generation; professor can re-generate as needed
-- ============================================================

CREATE TABLE semester_reports (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT          NOT NULL,
  config      JSONB         NOT NULL DEFAULT '{}'::jsonb,
  content     JSONB         NOT NULL DEFAULT '{}'::jsonb,
  session_ids UUID[]        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX semester_reports_user_id_idx ON semester_reports(user_id);

ALTER TABLE semester_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON semester_reports FOR SELECT
  USING (auth.uid() = user_id);
