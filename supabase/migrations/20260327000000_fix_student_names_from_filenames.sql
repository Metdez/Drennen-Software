-- Re-derive student_name from the stored filename column using corrected parsing.
-- Fixes: concatenated names (HannaZack → Zack H.), LATE marker treated as name,
-- and digit-as-initial fallback from the old parser.

CREATE OR REPLACE FUNCTION _temp_parse_student_name(raw_filename TEXT)
RETURNS TEXT AS $$
DECLARE
  base_name TEXT;
  segments TEXT[];
  parts TEXT[];
  name_seg TEXT;
  camel_parts TEXT[];
  first_name TEXT;
  last_initial TEXT;
BEGIN
  -- Strip path: keep only the base filename
  base_name := regexp_replace(raw_filename, '^.*/', '');

  -- Split on underscore
  segments := string_to_array(base_name, '_');

  IF array_length(segments, 1) IS NULL OR array_length(segments, 1) < 2 THEN
    RETURN 'Unknown Student';
  END IF;

  -- Filter out LATE segments
  parts := ARRAY(
    SELECT s FROM unnest(segments) AS s WHERE upper(s) != 'LATE'
  );

  IF array_length(parts, 1) IS NULL OR array_length(parts, 1) < 2 THEN
    RETURN 'Unknown Student';
  END IF;

  -- Format A: Lastname_Firstname_StudentID (underscore-separated names)
  IF parts[2] !~ '^\d+$'
     AND array_length(parts, 1) >= 3
     AND parts[3] ~ '^\d+$' THEN
    first_name := initcap(parts[2]);
    last_initial := upper(left(parts[1], 1));
    RETURN first_name || ' ' || last_initial || '.';
  END IF;

  -- Format B/C: LastnameFirstname_StudentID (concatenated)
  IF parts[2] ~ '^\d+$' THEN
    name_seg := parts[1];

    -- CamelCase split on lowercase→uppercase transitions
    camel_parts := regexp_split_to_array(name_seg, '(?<=[a-z])(?=[A-Z])');

    IF array_length(camel_parts, 1) >= 2 THEN
      first_name := camel_parts[array_length(camel_parts, 1)];
      last_initial := upper(left(camel_parts[1], 1));
      RETURN initcap(first_name) || ' ' || last_initial || '.';
    ELSE
      -- No camelCase boundary; return title-cased whole segment
      RETURN initcap(name_seg);
    END IF;
  END IF;

  -- Fallback
  RETURN initcap(parts[1]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Apply the fix to all rows that have a filename
UPDATE student_submissions
SET student_name = _temp_parse_student_name(filename)
WHERE filename IS NOT NULL AND filename != '';

-- Clean up
DROP FUNCTION IF EXISTS _temp_parse_student_name(TEXT);
