-- ============================================================
-- Student Submissions Table
-- Persists per-student raw text at processing time for analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS student_submissions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_name  TEXT NOT NULL,
  raw_text      TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS student_submissions_session_id_idx ON student_submissions(session_id);

ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;

-- Professors can SELECT submissions that belong to their own sessions
CREATE POLICY "Users can view submissions for own sessions"
  ON student_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = student_submissions.session_id
        AND sessions.user_id = auth.uid()
    )
  );

-- No INSERT policy — inserts are done via service role (admin client), same as sessions
-- No UPDATE policy — submissions are immutable
-- No DELETE policy — history is preserved (cascades from sessions if ever needed)
