-- Create session_analyses table to persistently cache Gemini session analysis results.
-- This eliminates repeated Gemini API calls when a professor revisits a session's
-- Analysis or Insights tabs from History.

CREATE TABLE IF NOT EXISTS session_analyses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id),
  analysis    JSONB       NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- One analysis per session
CREATE UNIQUE INDEX IF NOT EXISTS session_analyses_session_id_idx
  ON session_analyses(session_id);

ALTER TABLE session_analyses ENABLE ROW LEVEL SECURITY;

-- Professors can read their own session analyses
CREATE POLICY "Users can view own session analyses"
  ON session_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- Service role inserts on behalf of users (fire-and-forget from /api/process)
-- WITH CHECK (true) allows the service role to insert regardless of auth.uid()
CREATE POLICY "Service role can insert session analyses"
  ON session_analyses FOR INSERT
  WITH CHECK (true);
