-- Speaker portals: interactive, public preparation pages for guest speakers.
-- One portal per session, with optional professor edits and post-session feedback.
-- Access is via a unique share_token (no login required for speakers).

CREATE TABLE speaker_portals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         JSONB       NOT NULL,          -- AI-generated SpeakerPortalContent (sections 1-5)
  edited_content  JSONB,                         -- professor overrides (same shape), NULL = no edits
  post_session    JSONB,                         -- PostSessionFeedback (section 6), NULL until debrief completed
  share_token     UUID        NOT NULL DEFAULT gen_random_uuid(),
  is_published    BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One portal per session
CREATE UNIQUE INDEX speaker_portals_session_id_idx ON speaker_portals(session_id);

-- Fast lookup by token for public access
CREATE UNIQUE INDEX speaker_portals_token_idx ON speaker_portals(share_token);

ALTER TABLE speaker_portals ENABLE ROW LEVEL SECURITY;

-- Professors can read their own portals
CREATE POLICY "Users can view own speaker portals"
  ON speaker_portals FOR SELECT
  USING (auth.uid() = user_id);

-- All write operations go through createAdminClient() (service role bypasses RLS)
