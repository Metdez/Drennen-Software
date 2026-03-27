-- ============================================================
-- Semesters table
-- Organizes sessions into time-bounded groups for a professor.
-- Only ONE active semester per professor at a time (enforced by partial unique index).
-- ============================================================

CREATE TABLE semesters (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  start_date DATE        NOT NULL,
  end_date   DATE        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT semesters_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX semesters_user_id_idx ON semesters(user_id);
CREATE INDEX semesters_user_status_idx ON semesters(user_id, status);

-- Enforce at most one active semester per user
CREATE UNIQUE INDEX semesters_one_active_per_user
  ON semesters(user_id) WHERE status = 'active';

ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own semesters"
  ON semesters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own semesters"
  ON semesters FOR INSERT
  WITH CHECK (auth.uid() = user_id);
