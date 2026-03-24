-- ============================================================
-- Create student_submissions table
-- Stores individual parsed student submission text per session
-- Populated by /api/process when a ZIP is uploaded
-- ============================================================

CREATE TABLE student_submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_name    TEXT NOT NULL,        -- "Sarah M." (FirstName LastInitial.)
  submission_text TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX student_submissions_session_id_idx ON student_submissions(session_id);
CREATE INDEX student_submissions_student_name_idx ON student_submissions(student_name);

ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;

-- Users can read submissions that belong to their own sessions
CREATE POLICY "Users can view submissions for their sessions"
  ON student_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = student_submissions.session_id
        AND sessions.user_id = auth.uid()
    )
  );

-- No INSERT policy for users — service role admin client handles inserts
-- No UPDATE or DELETE — submissions are immutable like sessions
