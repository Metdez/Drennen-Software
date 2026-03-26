-- Enable shareable session links via secret UUID tokens.
-- Sharing is toggled by INSERT (enable) / DELETE (revoke).

CREATE TABLE session_shares (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token UUID        NOT NULL DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One share per session
CREATE UNIQUE INDEX session_shares_session_id_idx ON session_shares(session_id);

-- Fast lookup by token for public access
CREATE UNIQUE INDEX session_shares_token_idx ON session_shares(share_token);

ALTER TABLE session_shares ENABLE ROW LEVEL SECURITY;

-- Professors can view their own shares (needed for the UI to show share state)
CREATE POLICY "Users can view own session shares"
  ON session_shares FOR SELECT
  USING (auth.uid() = user_id);

-- All write operations go through createAdminClient() (service role bypasses RLS)
