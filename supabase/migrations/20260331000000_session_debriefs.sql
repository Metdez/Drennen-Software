-- Post-session debrief capture: one debrief per session
CREATE TABLE session_debriefs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_rating       INTEGER     CHECK (overall_rating BETWEEN 1 AND 5),
  questions_feedback   JSONB       DEFAULT '[]'::jsonb,
  surprise_moments     TEXT        DEFAULT '',
  speaker_feedback     TEXT        DEFAULT '',
  student_observations JSONB       DEFAULT '[]'::jsonb,
  followup_topics      TEXT        DEFAULT '',
  private_notes        TEXT        DEFAULT '',
  ai_summary           TEXT,
  status               TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'complete')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX session_debriefs_session_id_idx ON session_debriefs(session_id);
CREATE INDEX session_debriefs_user_id_idx ON session_debriefs(user_id);

ALTER TABLE session_debriefs ENABLE ROW LEVEL SECURITY;

-- Professors can read their own debriefs
CREATE POLICY "Users can view own debriefs"
  ON session_debriefs FOR SELECT
  USING (auth.uid() = user_id);
