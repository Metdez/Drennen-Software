/**
 * @file types/student_speaker_analysis.ts
 * @description Student speaker analysis (post-session evaluation) submission types.
 *
 * After a guest speaker session, students can submit written evaluations
 * analysing the speaker's leadership style, communication approach, and
 * real-world relevance to course concepts. This is distinct from question
 * submissions (pre-session) and debrief reflections (personal takeaways).
 *
 * Submissions are stored in `student_speaker_analysis_submissions` and the
 * AI evaluation result (produced by `lib/ai/speakerAnalysisEvaluation.ts`)
 * is stored in `student_speaker_analyses`.
 *
 * Accessed through:
 *   GET/POST /api/sessions/[id]/speaker-analyses → raw submissions + AI evaluation
 *
 * Speaker analysis data also feeds into student profile generation
 * (`lib/ai/studentProfile.ts`), providing a third dimension of student
 * engagement data alongside question quality and debrief reflections.
 *
 * Row vs Domain:
 *   StudentSpeakerAnalysisSubmissionRow — raw Supabase row (snake_case,
 *                                          `student_speaker_analysis_submissions` table)
 *   StudentSpeakerAnalysis              — AI evaluation result (no DB Row equivalent;
 *                                          stored as JSONB in `student_speaker_analyses`)
 */

// ── Student speaker analysis (post-session evaluation) types ─────────────────

/** Raw database row for the `student_speaker_analysis_submissions` table. */
export interface StudentSpeakerAnalysisSubmissionRow {
  id: string
  session_id: string
  /** Normalised display name derived from the submission filename (e.g. "Jane S."). */
  student_name: string
  /** Original filename from the upload. */
  filename: string
  /** Raw parsed text of the student's speaker evaluation. */
  submission_text: string
  created_at: string
}

/**
 * AI evaluation of all student speaker analyses for a session.
 * Produced by `lib/ai/speakerAnalysisEvaluation.ts` and stored as JSONB
 * in `student_speaker_analyses.result`.
 *
 * Surfaced on the session's speaker-analyses panel. Also feeds into
 * `SessionSynthesis` via the synthesis agent.
 */
export interface StudentSpeakerAnalysis {
  /** Thematic patterns across student evaluations of the speaker. */
  evaluation_themes: Array<{
    name: string
    description: string
    /** Number of students who addressed this evaluation theme. */
    student_count: number
    /** Representative quotes from students on this theme. */
    quotes: Array<{ text: string; student_name: string }>
  }>
  /** Leadership or professional qualities students observed in the speaker. */
  leadership_qualities: Array<{
    quality: string
    description: string
    /** How many students mentioned this quality. */
    mentioned_by: number
    /** Direct quotes from students about this quality. */
    quotes: Array<{ text: string; student_name: string }>
  }>
  /** Connections students drew between the speaker's experience and course concepts. */
  course_concept_connections: Array<{
    concept: string
    /** Number of students who made this connection. */
    student_count: number
    /** Specific student examples of the concept connection. */
    examples: Array<{ text: string; student_name: string }>
  }>
  /** Points the majority of students agreed on about the speaker or session. */
  areas_of_agreement: Array<{
    point: string
    /** How many students shared this view. */
    student_count: number
    /** Whether the consensus view was positive, negative, or neutral. */
    sentiment: 'positive' | 'negative' | 'neutral'
  }>
  /** Points where students held meaningfully different views. */
  areas_of_disagreement: Array<{
    point: string
    /** The distinct positions students took, with attribution. */
    perspectives: Array<{ position: string; student_name: string }>
  }>
  /**
   * Distribution of analytical depth across student evaluations.
   * Values are counts of students at each sophistication level.
   */
  analytical_sophistication: {
    /** Students demonstrating nuanced, evidence-backed analysis. */
    high: number
    /** Students demonstrating solid but less nuanced analysis. */
    moderate: number
    /** Students making surface-level observations only. */
    surface: number
    /** AI narrative summarising the overall analytical quality of the cohort. */
    summary: string
  }
  /** Unusually insightful or distinctive observations worth the professor's attention. */
  notable_observations: Array<{
    text: string
    student_name: string
    /** Why this observation was flagged as notable. */
    why_notable: string
  }>
  /** AI-generated narrative paragraph summarising the cohort's speaker evaluations. */
  summary: string
}
