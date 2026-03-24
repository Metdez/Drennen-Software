-- Class-wide AI analysis (one row per professor, upserted after each session upload)
CREATE TABLE class_insights (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis      JSONB       NOT NULL,
  session_count INTEGER     NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX class_insights_user_id_idx ON class_insights(user_id);

ALTER TABLE class_insights ENABLE ROW LEVEL SECURITY;

-- Professors can read their own insights (cookie-based auth)
CREATE POLICY "users can read own insights"
  ON class_insights FOR SELECT
  USING (auth.uid() = user_id);

-- Writes come from the service role (admin client) which bypasses RLS
