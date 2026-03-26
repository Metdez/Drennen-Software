-- Per-student AI analysis (one row per professor+student pair, upserted after each session upload)
CREATE TABLE student_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name  TEXT        NOT NULL,
  analysis      JSONB       NOT NULL,
  session_count INTEGER     NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX student_profiles_user_student_idx ON student_profiles(user_id, student_name);

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Professors can read their own student profiles (cookie-based auth)
CREATE POLICY "users can read own student profiles"
  ON student_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Writes come from the service role (admin client) which bypasses RLS
