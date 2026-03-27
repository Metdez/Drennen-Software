-- Speaker prep briefs: polished documents for guest speakers.
-- One brief per session, with optional professor edits stored separately.

CREATE TABLE speaker_briefs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         JSONB       NOT NULL,
  edited_content  JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One brief per session
CREATE UNIQUE INDEX speaker_briefs_session_id_idx ON speaker_briefs(session_id);

ALTER TABLE speaker_briefs ENABLE ROW LEVEL SECURITY;

-- Professors can read their own briefs
CREATE POLICY "Users can view own speaker briefs"
  ON speaker_briefs FOR SELECT
  USING (auth.uid() = user_id);

-- All write operations go through createAdminClient() (service role bypasses RLS)
