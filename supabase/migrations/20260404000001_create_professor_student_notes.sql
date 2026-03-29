-- Professor-authored notes per student (survives AI profile regeneration)
CREATE TABLE professor_student_notes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name          TEXT        NOT NULL,
  note_text             TEXT        NOT NULL,
  flagged_for_followup  BOOLEAN     NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prof_notes_user_student
  ON professor_student_notes(user_id, student_name);

ALTER TABLE professor_student_notes ENABLE ROW LEVEL SECURITY;

-- Professors can read their own notes (cookie-based auth)
CREATE POLICY "users can read own notes"
  ON professor_student_notes FOR SELECT
  USING (auth.uid() = user_id);

-- Writes come from the service role (admin client) which bypasses RLS
