-- Portfolio sharing: one master link per professor for read-only portfolio access
CREATE TABLE portfolio_shares (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token UUID        NOT NULL DEFAULT gen_random_uuid(),
  enabled     BOOLEAN     NOT NULL DEFAULT true,
  config      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One portfolio share per professor
CREATE UNIQUE INDEX portfolio_shares_user_id_idx ON portfolio_shares(user_id);

-- Fast lookup by token for public access
CREATE UNIQUE INDEX portfolio_shares_token_idx ON portfolio_shares(share_token);

ALTER TABLE portfolio_shares ENABLE ROW LEVEL SECURITY;

-- Professors can view their own portfolio share
CREATE POLICY "Users can view own portfolio share"
  ON portfolio_shares FOR SELECT
  USING (auth.uid() = user_id);
