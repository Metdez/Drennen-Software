-- ============================================================
-- Backfill session_themes for sessions created before the
-- theme-extraction feature was added to /api/process.
-- Only inserts rows for sessions that have no themes yet.
-- m[1] = section number (1-10), m[2] = theme title text
-- ============================================================

INSERT INTO session_themes (session_id, theme_number, theme_title)
SELECT s.id, m[1]::int, m[2]
FROM sessions s,
LATERAL (
  SELECT regexp_matches(s.output, '\*{3}(\d+)\.\s+(.+?)\*{3}', 'g') AS m
) AS t
WHERE NOT EXISTS (
  SELECT 1 FROM session_themes st WHERE st.session_id = s.id
);
