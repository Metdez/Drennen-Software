-- Cached Gemini analysis of student speaker evaluations (one per session)
CREATE TABLE student_speaker_analyses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  analysis    JSONB NOT NULL,
  file_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX student_speaker_analyses_session_id_idx ON student_speaker_analyses(session_id);

ALTER TABLE student_speaker_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own student speaker analyses"
  ON student_speaker_analyses FOR SELECT
  USING (auth.uid() = user_id);
