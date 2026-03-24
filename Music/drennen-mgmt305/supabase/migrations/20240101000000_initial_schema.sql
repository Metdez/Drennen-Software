-- ============================================================
-- Drennen MGMT 305 — Initial Schema
-- ============================================================

-- Sessions table
-- Stores every AI generation run by every professor
CREATE TABLE sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  speaker_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  output        TEXT NOT NULL,
  file_count    INTEGER NOT NULL DEFAULT 0
);

-- Indexes for common query patterns
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_created_at_idx ON sessions(created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT their own sessions
CREATE POLICY "Users can view own sessions"
  ON sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only INSERT sessions for themselves
CREATE POLICY "Users can insert own sessions"
  ON sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE policy — sessions are immutable
-- No DELETE policy — professors cannot delete history

-- ============================================================
-- Notes
-- ============================================================
-- The auth.users table is managed entirely by Supabase Auth.
-- We never create or modify it.
-- New professor accounts are created via the Supabase dashboard.
-- Self-signup is disabled at the project level (see DECISIONS.md DEC-006).
