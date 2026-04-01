-- ============================================================
-- Track which custom prompt version generated a session.
-- NULL means the built-in default prompt was used.
-- ============================================================

ALTER TABLE sessions
  ADD COLUMN prompt_version_id UUID REFERENCES custom_system_prompts(id) ON DELETE SET NULL;

CREATE INDEX sessions_prompt_version_id_idx ON sessions(prompt_version_id);
