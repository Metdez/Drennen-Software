-- Normalize digit-looking last initials to their letter equivalents.
-- Canvas exports sometimes include a numeric student ID as the second filename segment,
-- causing the parsed "last initial" to be a digit (e.g. "1") instead of a letter (e.g. "L").
-- This deduplicates students who were stored under both forms.

UPDATE student_submissions
SET student_name = regexp_replace(student_name, ' 1\.$', ' L.')
WHERE student_name ~ ' 1\.$';

UPDATE student_submissions
SET student_name = regexp_replace(student_name, ' 0\.$', ' O.')
WHERE student_name ~ ' 0\.$';

UPDATE student_submissions
SET student_name = regexp_replace(student_name, ' 5\.$', ' S.')
WHERE student_name ~ ' 5\.$';

UPDATE student_submissions
SET student_name = regexp_replace(student_name, ' 8\.$', ' B.')
WHERE student_name ~ ' 8\.$';
