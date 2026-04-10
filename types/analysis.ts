/**
 * @file types/analysis.ts
 * @description AI analysis types produced by the Gemini analysis agent.
 *
 * These types represent structured outputs from `lib/ai/analysisAgent.ts`
 * (`runSessionAnalysis()` and `runThemeAnalysis()`). Results are cached in the
 * `session_analyses` DB table and exposed through:
 *   GET/POST /api/sessions/[id]/analysis
 *   GET      /api/analytics/themes
 *
 * On the /preview page, analysis data is cached in sessionStorage under the
 * key `analysis_${sessionId}` to avoid redundant API calls when switching tabs.
 *
 * None of these types have a DB Row counterpart — the analysis JSONB is stored
 * as-is in `session_analyses.result` and returned directly to the client.
 */

/**
 * A single student question, attributed to its author.
 * Used as supporting evidence inside a `ThemeCluster`.
 */
/**
 * Defines the structure for a single question asked by a student.
 * 1. What it does: Holds the text content of a student's question and the name of the student who asked it.
 * 2. Why it is used: It is used within `ThemeCluster` to provide full attribution for each question belonging to a specific theme. This allows for display of individual questions along with their origin in the analysis view.
 * 3. Important implementation details: A simple object type, consisting of two string properties: `text` for the question content and `student_name` for attribution.
 */
export interface ThemeQuestion {
  text: string
  student_name: string
}

/**
 * A cluster of semantically related student questions grouped under a named theme.
 * Displayed in the "analysis" tab of /preview (AnalysisPanelLeft component).
 */
/**
 * A cluster of semantically related student questions grouped under a named theme.
 * 1. What it does: Groups student questions that share a common underlying topic or theme, summarizing them with a name and a representative question.
 * 2. Why it is used: To organize and make sense of potentially hundreds of student questions from a session. It's prominently displayed in the "analysis" tab of the `/preview` page, specifically rendered by the `AnalysisPanelLeft` component, to help professors quickly grasp key discussion areas.
 * 3. Important implementation details: Includes a `name` (e.g., "Work-Life Balance"), a `question_count`, a `top_question` (the most representative one), and an array of `ThemeQuestion` objects that provide the full list of questions with student attribution.
 */
export interface ThemeCluster {
  /** Human-readable theme name (e.g. "Work-Life Balance"). */
  name: string
  /** Total number of questions assigned to this cluster. */
  question_count: number
  /** The single most representative question in the cluster. */
  top_question: string
  /** All questions belonging to this cluster with student attribution. */
  questions: ThemeQuestion[]
}

/**
 * Full per-session analysis produced by `runSessionAnalysis()`.
 * Stored as JSONB in `session_analyses.result`.
 *
 * Rendered across two panels on the /preview "analysis" and "insights" tabs:
 *   - AnalysisPanelLeft  → theme_clusters, tensions
 *   - AnalysisPanelRight → suggestions, blind_spots, sentiment
 */
/**
 * Full per-session analysis produced by `runSessionAnalysis()`.
 * 1. What it does: This interface represents the comprehensive output of the AI-driven analysis for an entire classroom session, covering various aspects of student engagement and insights.
 * 2. Why it is used: It serves as the primary data structure for displaying all key analytical results for a session to the user. It is stored as JSONB in the `session_analyses.result` database column. On the frontend, its data is rendered across two main panels (`AnalysisPanelLeft` and `AnalysisPanelRight`) on the `/preview` "analysis" and "insights" tabs.
 * 3. Important implementation details: It aggregates several sub-analyses: `theme_clusters` (question groupings), `tensions` (contradictions), `suggestions` (actionable advice), `blind_spots` (missed topics), and `sentiment` (emotional tone distribution). The `sentiment` values are percentages (0–100) that should sum to approximately 100.
 */
export interface SessionAnalysis {
  /** Semantically distinct question clusters across the session. */
  theme_clusters: ThemeCluster[]
  /** Points of intellectual tension or contradiction between student questions. */
  tensions: Array<{ label: string; description: string }>
  /** Actionable suggestions for the professor based on the question patterns. */
  suggestions: Array<{ text: string; reason: string }>
  /** Topics students did NOT ask about that would have been relevant. */
  blind_spots: Array<{ title: string; description: string }>
  /**
   * Emotional/motivational tone distribution across all questions.
   * Values are percentages (0–100) that should sum to ~100.
   */
  sentiment: {
    aspirational: number
    curious: number
    personal: number
    critical: number
  }
}

/**
 * Deep analysis of a single theme, produced by `runThemeAnalysis()`.
 * Returned by GET /api/sessions/[id]/analysis when a `theme` query param is
 * provided; also used on the /preview/theme page.
 */
/**
 * Deep analysis of a single theme, produced by `runThemeAnalysis()`.
 * 1. What it does: Provides an in-depth, specific analysis for a single identified theme from a classroom session.
 * 2. Why it is used: This detailed analysis is requested when a professor wants to explore a particular theme more thoroughly. It's returned by the `GET /api/sessions/[id]/analysis` endpoint when a `theme` query parameter is provided, and it is used to populate the dedicated `/preview/theme` page.
 * 3. Important implementation details: It includes a `narrative` description, `probe_questions` for follow-up, `missed_angles` related to the theme, and `patterns` with visual observations.
 */
export interface ThemeAnalysis {
  /** Narrative description of why this theme emerged in the class. */
  narrative: string
  /** Follow-up probe questions the professor could use during the interview. */
  probe_questions: Array<{ question: string; why: string }>
  /** Angles or sub-topics students missed when exploring this theme. */
  missed_angles: string[]
  /** Visual pattern observations about how students engaged with this theme. */
  patterns: Array<{ emoji: string; text: string }>
}

/**
 * Theme analysis aggregated across multiple sessions (cross-session view).
 * Used on the /analytics/theme page to show how a recurring theme evolves
 * over the semester.
 */
/**
 * Theme analysis aggregated across multiple sessions (cross-session view).
 * 1. What it does: This interface defines the structure for analyzing a specific recurring theme across multiple teaching sessions.
 * 2. Why it is used: It enables professors to observe how a particular theme evolves or manifests over a longer period, such as an entire semester. This cross-session view is utilized on the `/analytics/theme` page to provide longitudinal insights into student engagement with consistent topics.
 * 3. Important implementation details: It includes a `narrative` summary of the theme's evolution, `patterns` observed across sessions, `missed_angles` that no session covered, and `relevant_questions` with `speaker_name` to attribute questions back to their original session context.
 */
export interface CrossSessionThemeAnalysis {
  /** Narrative summary of the theme's evolution across sessions. */
  narrative: string
  /** Cross-session patterns with visual indicators. */
  patterns: Array<{ emoji: string; text: string }>
  /** Angles that no session's questions covered for this theme. */
  missed_angles: string[]
  /**
   * Representative questions for this theme, with the speaker context
   * needed to understand which session each question came from.
   */
  relevant_questions: Array<{ student_name: string; text: string; speaker_name: string }>
}
