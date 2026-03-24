-- ============================================================
-- execute_analytics_query(query_text TEXT) → JSON
-- Used by the analytics SQL agent to run read-only SELECT queries.
-- SECURITY DEFINER so the function can read all tables regardless of RLS.
-- The SELECT-only guard prevents write operations.
-- ============================================================

CREATE OR REPLACE FUNCTION execute_analytics_query(query_text TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  trimmed TEXT;
BEGIN
  trimmed := lower(trim(query_text));

  -- Reject anything that isn't a SELECT or a CTE starting with WITH
  IF NOT (trimmed LIKE 'select%' OR trimmed LIKE 'with%') THEN
    RAISE EXCEPTION 'Only SELECT queries are permitted in analytics.';
  END IF;

  -- Belt-and-suspenders: reject write keywords inside the query
  IF trimmed ~* '\m(insert|update|delete|drop|create|alter|truncate|grant|revoke)\M' THEN
    RAISE EXCEPTION 'Write operations are not permitted in analytics.';
  END IF;

  EXECUTE format(
    'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (%s) t',
    query_text
  ) INTO result;

  RETURN result;
END;
$$;

-- Allow the service role (used by the Next.js server) to call this function
GRANT EXECUTE ON FUNCTION execute_analytics_query(TEXT) TO service_role;
