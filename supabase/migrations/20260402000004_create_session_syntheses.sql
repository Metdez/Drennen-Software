-- Cached Gemini synthesis of all session data types (one per session)
CREATE TABLE session_syntheses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  synthesis   JSONB NOT NULL,
  data_types  TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX session_syntheses_session_id_idx ON session_syntheses(session_id);

ALTER TABLE session_syntheses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session syntheses"
  ON session_syntheses FOR SELECT
  USING (auth.uid() = user_id);
