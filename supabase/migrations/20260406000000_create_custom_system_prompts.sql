-- ============================================================
-- Custom System Prompts
-- Versioned per-user overrides of the default session-generation prompt
-- ============================================================

CREATE TABLE custom_system_prompts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version     INTEGER     NOT NULL,
  label       TEXT,
  prompt_text TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX custom_system_prompts_active_idx
  ON custom_system_prompts(user_id)
  WHERE is_active = true;

CREATE UNIQUE INDEX custom_system_prompts_user_version_idx
  ON custom_system_prompts(user_id, version);

ALTER TABLE custom_system_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompts"
  ON custom_system_prompts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service-role helper: create and activate a new prompt version atomically.
CREATE OR REPLACE FUNCTION create_custom_system_prompt_version(
  p_user_id UUID,
  p_prompt_text TEXT,
  p_label TEXT DEFAULT NULL
)
RETURNS custom_system_prompts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_version INTEGER;
  v_row custom_system_prompts;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT COUNT(*)
  INTO v_count
  FROM custom_system_prompts
  WHERE user_id = p_user_id;

  IF v_count >= 50 THEN
    RAISE EXCEPTION 'Prompt version limit reached';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_version
  FROM custom_system_prompts
  WHERE user_id = p_user_id;

  UPDATE custom_system_prompts
  SET is_active = false
  WHERE user_id = p_user_id
    AND is_active = true;

  INSERT INTO custom_system_prompts (user_id, version, label, prompt_text, is_active)
  VALUES (p_user_id, v_version, NULLIF(TRIM(COALESCE(p_label, '')), ''), p_prompt_text, true)
  RETURNING *
  INTO v_row;

  RETURN v_row;
END;
$$;

-- Service-role helper: switch active prompt version atomically.
CREATE OR REPLACE FUNCTION activate_custom_system_prompt_version(
  p_user_id UUID,
  p_prompt_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  IF NOT EXISTS (
    SELECT 1
    FROM custom_system_prompts
    WHERE id = p_prompt_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Prompt version not found';
  END IF;

  UPDATE custom_system_prompts
  SET is_active = false
  WHERE user_id = p_user_id
    AND is_active = true;

  UPDATE custom_system_prompts
  SET is_active = true
  WHERE id = p_prompt_id
    AND user_id = p_user_id;
END;
$$;

-- Service-role helper: revert user back to the built-in default prompt.
CREATE OR REPLACE FUNCTION reset_custom_system_prompts_to_default(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE custom_system_prompts
  SET is_active = false
  WHERE user_id = p_user_id
    AND is_active = true;
END;
$$;
