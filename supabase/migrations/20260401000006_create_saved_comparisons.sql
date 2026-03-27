-- ============================================================
-- Saved session comparisons: AI-generated comparative analyses
-- between two sessions, with optional public share tokens.
-- ============================================================

CREATE TABLE saved_comparisons (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id_a  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  session_id_b  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  ai_comparison JSONB       NOT NULL,
  share_token   UUID        UNIQUE DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Enforce normalized ordering to prevent duplicate reversed pairs
  CONSTRAINT chk_session_order CHECK (session_id_a < session_id_b)
);

-- One comparison per session pair per user
CREATE UNIQUE INDEX idx_saved_comparisons_pair
  ON saved_comparisons (user_id, session_id_a, session_id_b);

-- Fast share token lookup (partial — only indexed when not null)
CREATE UNIQUE INDEX idx_saved_comparisons_token
  ON saved_comparisons (share_token) WHERE share_token IS NOT NULL;

ALTER TABLE saved_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own comparisons"
  ON saved_comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts comparisons"
  ON saved_comparisons FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role updates comparisons"
  ON saved_comparisons FOR UPDATE
  USING (true);
