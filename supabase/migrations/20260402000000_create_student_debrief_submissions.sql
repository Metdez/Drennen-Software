-- Student debrief submissions: one row per student per session for post-session reflections
CREATE TABLE student_debrief_submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_name    TEXT NOT NULL,
  filename        TEXT NOT NULL DEFAULT '',
  submission_text TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX student_debrief_submissions_session_id_idx ON student_debrief_submissions(session_id);
CREATE INDEX student_debrief_submissions_student_name_idx ON student_debrief_submissions(student_name);

ALTER TABLE student_debrief_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view debrief submissions for their sessions"
  ON student_debrief_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = student_debrief_submissions.session_id
        AND sessions.user_id = auth.uid()
    )
  );
