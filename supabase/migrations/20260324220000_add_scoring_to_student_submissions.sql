-- ============================================================
-- Add quality scoring columns to student_submissions
-- Populated asynchronously by Gemini after session creation
-- ============================================================

ALTER TABLE public.student_submissions
  ADD COLUMN IF NOT EXISTS score INTEGER,
  ADD COLUMN IF NOT EXISTS explanation TEXT,
  ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;
