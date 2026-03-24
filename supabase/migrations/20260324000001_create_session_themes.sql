-- ============================================================
-- Create session_themes table
-- Stores parsed theme titles extracted from AI output per session
-- Populated by /api/process after AI generation
-- ============================================================

CREATE TABLE session_themes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  theme_number INTEGER NOT NULL,     -- 1-based index from AI output
  theme_title  TEXT NOT NULL,        -- e.g. "Leadership Under Pressure"
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX session_themes_session_id_idx ON session_themes(session_id);

ALTER TABLE session_themes ENABLE ROW LEVEL SECURITY;

-- Users can read themes that belong to their own sessions
CREATE POLICY "Users can view themes for their sessions"
  ON session_themes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_themes.session_id
        AND sessions.user_id = auth.uid()
    )
  );

-- No INSERT policy for users — service role admin client handles inserts
-- No UPDATE or DELETE — themes are immutable like sessions
