-- Semester Stories: long-form narrative documents about a semester
CREATE TABLE semester_stories (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester_id   UUID          NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  title         TEXT          NOT NULL,
  sections      JSONB         NOT NULL DEFAULT '[]'::jsonb,
  session_ids   UUID[]        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX semester_stories_user_id_idx ON semester_stories(user_id);
CREATE UNIQUE INDEX semester_stories_semester_unique ON semester_stories(semester_id);

ALTER TABLE semester_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stories"
  ON semester_stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stories"
  ON semester_stories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
