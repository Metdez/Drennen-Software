-- Add filename column to student_submissions
-- Stores the original file name so the roster detail view can display it
ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS filename TEXT NOT NULL DEFAULT '';
