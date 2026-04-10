/**
 * @file types/student_debrief.ts
 * @description Student debrief (post-session reflection) submission types.
 *
 * After a guest speaker session, students can submit written reflections
 * via a separate file upload. These are a distinct submission type from the
 * original question submissions — they capture what students took away from
 * the session rather than what they wanted to ask.
 *
 * Submissions are stored in `student_debrief_submissions` and the AI analysis
 * result (produced by `lib/ai/debriefReflectionAnalysis.ts`) is stored in
 * `student_debrief_analyses`.
 *
 * Accessed through:
 *   GET/POST /api/sessions/[id]/student-debriefs → raw submissions + analysis
 *
 * Student debrief data also feeds into student profile generation
 * (`lib/ai/studentProfile.ts`), enriching the growth intelligence profile
 * with post-session reflection patterns.
 *
 * Row vs Domain:
 *   StudentDebriefSubmissionRow — raw Supabase row (snake_case,
 *                                  `student_debrief_submissions` table)
 *   StudentDebriefAnalysis      — AI analysis result (no DB Row equivalent;
 *                                  stored as JSONB in `student_debrief_analyses`)
 */

// ── Student debrief (post-session reflection) types ─────────────────────────

/** Raw database row for the `student_debrief_submissions` table. */
export interface StudentDebriefSubmissionRow {
  id: string
  session_id: string
  /** Normalised display name derived from the submission filename (e.g. "Jane S."). */
  student_name: string
  /** Original filename from the upload. */
  filename: string
  /** Raw parsed text of the student's post-session reflection. */
  submission_text: string
  created_at: string
}

/**
 * AI analysis of all student debrief reflections for a session.
 * Produced by `lib/ai/debriefReflectionAnalysis.ts` and stored as JSONB
 * in `student_debrief_analyses.result`.
 *
 * Surfaced on the session's student-debriefs panel. Also feeds into
 * `SessionSynthesis` via the synthesis agent.
 */
export interface StudentDebriefAnalysis {
  /** Themes that emerged across multiple students' reflections. */
  reflection_themes: Array<{
    name: string
    description: string
    /** Number of students whose reflection addressed this theme. */
    student_count: number
    /** Representative quotes from students for this theme. */
    quotes: Array<{ text: string; student_name: string }>
  }>
  /**
   * Moments from the session that multiple students mentioned as significant.
   * Ordered by how many students referenced each moment.
   */
  key_moments: Array<{
    moment: string
    /** How many students mentioned this moment. */
    mentioned_by: number
    /** Overall sentiment toward this moment across students. */
    sentiment: 'positive' | 'neutral' | 'mixed'
  }>
  /** Things that surprised students — moments that exceeded or challenged their expectations. */
  surprises: Array<{ text: string; student_name: string }>
  /** Points where students connected the speaker's experience to their own career thinking. */
  career_connections: Array<{
    text: string
    student_name: string
    /** Broad career area the student connected to (e.g. "entrepreneurship", "finance"). */
    career_area: string
  }>
  /**
   * Emotional tone distribution across student reflections.
   * Values are percentages (0–100) that should sum to ~100.
   */
  sentiment: {
    inspired: number
    reflective: number
    challenged: number
    indifferent: number
  }
  /** AI-generated narrative paragraph summarising all reflections. */
  summary: string
}
