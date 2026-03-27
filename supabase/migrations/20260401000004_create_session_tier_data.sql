-- ============================================================
-- Session tier data: Gemini-classified quality tiers for each session's questions
-- One row per session, populated fire-and-forget after session creation
-- ============================================================

CREATE TABLE session_tier_data (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tier_counts      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  tier_assignments JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

CREATE INDEX session_tier_data_session_id_idx ON session_tier_data(session_id);

ALTER TABLE session_tier_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tier data"
  ON session_tier_data FOR SELECT
  USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );
