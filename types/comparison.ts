/**
 * @file types/comparison.ts
 * @description Side-by-side session comparison and cross-semester cohort comparison types.
 *
 * Two distinct comparison features live here:
 *
 * 1. Session comparison — compare two individual sessions (themes, sentiment,
 *    participation overlap). Data flows through:
 *      GET  /api/compare                   → SessionComparisonData
 *      POST /api/compare/analysis          → ComparativeAnalysis
 *      POST /api/compare/share             → SavedComparison (with share token)
 *    Rendered on /compare and the public /shared/compare/[token] page.
 *
 * 2. Cohort/semester comparison — compare aggregate stats across two or more
 *    semesters (session counts, student counts, theme persistence). Data flows through:
 *      GET /api/semesters/compare          → CohortComparisonData
 *    Rendered on /analytics/compare.
 *
 * Row vs Domain (session comparison):
 *   SavedComparisonRow — raw Supabase row (snake_case, `saved_comparisons` table)
 *   SavedComparison    — camelCase domain object
 *
 * Row vs Domain (cohort comparison):
 *   CohortComparisonRow — raw Supabase row (snake_case, `cohort_comparisons` table)
 *   CohortComparison    — camelCase domain object
 */

import type { SessionSummary, SessionAnalysis } from './'
import type { SessionTierData } from './tier'

// ---------------------------------------------------------------------------
// Session comparison types
// ---------------------------------------------------------------------------

/**
 * Data for one side (A or B) of a session comparison.
 * Assembles the session summary, extracted theme titles, Gemini analysis,
 * tier classification, and student roster into a single comparable unit.
 */
/**
 * Data for one side (A or B) of a session comparison.
 * Assembles the session summary, extracted theme titles, Gemini analysis,
 * tier classification, and student roster into a single comparable unit.
 *
 * What it does: This interface defines a comprehensive data structure representing a single session when it's part of a two-session comparison.
 * Why it is used: It aggregates all necessary information for a session (summary, themes, AI analysis, tier data, student names) into one unified object, simplifying data retrieval and presentation in comparison UIs and backend logic.
 * Important implementation details: The 'analysis' and 'tierData' fields can be null, indicating that the AI analysis or tier classification for that session has not yet been generated or completed.
 */
export interface SessionComparisonSide {
  session: SessionSummary
  /** Theme titles extracted from the session's AI output. */
  themes: string[]
  /** Gemini analysis; null if analysis has not been generated yet. */
  analysis: SessionAnalysis | null
  /** Question quality tier data; null if not yet classified. */
  tierData: SessionTierData | null
  /** All student names who submitted for this session. */
  studentNames: string[]
}

/**
 * Result of comparing the theme lists between two sessions.
 * Used to highlight shared vs. unique topics in the comparison UI.
 */
/**
 * Result of comparing the theme lists between two sessions.
 * Used to highlight shared vs. unique topics in the comparison UI.
 *
 * What it does: This interface describes the outcome of comparing the thematic content of two sessions, identifying common and unique themes.
 * Why it is used: It is essential for visualizing the semantic relationships between sessions, allowing users to quickly grasp which topics are shared and which are distinct, enhancing the analytical value of the comparison.
 * Important implementation details: 'shared' themes are represented as pairs (themeA, themeB) to indicate a semantic match, while 'uniqueToA' and 'uniqueToB' list themes exclusive to each session. This structure is typically computed server-side.
 */
export interface ThemeOverlapResult {
  /** Theme pairs that are semantically similar across both sessions. */
  shared: Array<{ themeA: string; themeB: string }>
  /** Themes present only in session A. */
  uniqueToA: string[]
  /** Themes present only in session B. */
  uniqueToB: string[]
}

/**
 * Student participation breakdown between two sessions.
 * Computed server-side by comparing student name lists from both sessions.
 */
/**
 * Student participation breakdown between two sessions.
 * Computed server-side by comparing student name lists from both sessions.
 *
 * What it does: This interface details how student participation differs between two compared sessions.
 * Why it is used: It provides critical insights into student engagement patterns, showing who participated consistently, who was new to one session, or who dropped off. This data is valuable for professors to understand student cohorts and engagement.
 * Important implementation details: The calculation of 'bothSessions', 'onlyA', and 'onlyB' is performed on the server by comparing the lists of student names from the respective sessions. It also includes a 'totalUnique' count for overall student reach.
 */
export interface ParticipationDelta {
  /** Students who submitted to both sessions. */
  bothSessions: string[]
  /** Students who only submitted to session A. */
  onlyA: string[]
  /** Students who only submitted to session B. */
  onlyB: string[]
  /** Total unique students across both sessions combined. */
  totalUnique: number
}

/**
 * Full comparison payload returned by GET /api/compare.
 * Aggregates both session sides plus overlap analysis into a single object
 * for the /compare page.
 */
/**
 * Full comparison payload returned by GET /api/compare.
 * Aggregates both session sides plus overlap analysis into a single object
 * for the /compare page.
 *
 * What it does: This interface defines the complete data payload for a comparison between two individual sessions.
 * Why it is used: It serves as the primary data structure returned by the `/api/compare` endpoint, providing all the necessary components to render a comprehensive session comparison view in the frontend, including both session details, theme overlap, and participation changes.
 * Important implementation details: It combines two `SessionComparisonSide` objects ('a' and 'b'), the `ThemeOverlapResult`, `ParticipationDelta`, and an optional `savedComparison` record if the comparison has been previously saved and shared.
 */
export interface SessionComparisonData {
  a: SessionComparisonSide
  b: SessionComparisonSide
  themeOverlap: ThemeOverlapResult
  participationDelta: ParticipationDelta
  /**
   * Previously saved comparison record for this A/B pair, if one exists.
   * Contains the AI narrative and a shareable token.
   */
  savedComparison: SavedComparison | null
}

/**
 * AI-generated comparative narrative between two sessions.
 * Produced by `lib/ai/comparisonAgent.ts` and stored in `saved_comparisons.ai_comparison`.
 */
/**
 * AI-generated comparative narrative between two sessions.
 * Produced by `lib/ai/comparisonAgent.ts` and stored in `saved_comparisons.ai_comparison`.
 *
 * What it does: This interface structures the detailed analysis and narrative generated by an AI model when comparing two sessions.
 * Why it is used: It provides rich, qualitative insights and actionable recommendations beyond raw data, helping users quickly understand the key takeaways and implications of a session comparison. It powers the AI-narrative feature in the UI.
 * Important implementation details: It is generated by the `comparisonAgent.ts` module using AI, and its full structure (including narrative, key differences, sentiment shift, and recommendations) is stored as a JSONB blob in the database within the `ai_comparison` column.
 */
export interface ComparativeAnalysis {
  /** High-level narrative paragraph comparing the two sessions. */
  narrative: string
  /**
   * Specific differences broken down by analytical dimension
   * (themes, sentiment, participation, question quality, engagement).
   */
  key_differences: Array<{
    title: string
    description: string
    dimension: 'themes' | 'sentiment' | 'participation' | 'quality' | 'engagement'
  }>
  /** How the emotional/motivational tone of student questions shifted between sessions. */
  sentiment_shift: {
    summary: string
    notable_changes: Array<{
      dimension: string
      direction: 'up' | 'down' | 'stable'
      detail: string
    }>
  }
  /** Concrete suggestions for the professor based on what the comparison revealed. */
  recommendations: Array<{ text: string; reason: string }>
}

/** Raw database row for the `saved_comparisons` table. */
/**
 * Raw database row for the `saved_comparisons` table.
 *
 * What it does: This interface directly mirrors the schema of the `saved_comparisons` table in the database.
 * Why it is used: It defines the exact structure for storing and retrieving saved session comparisons from the database, ensuring data consistency and type safety during database interactions.
 * Important implementation details: Uses snake_case for field names to match typical database column conventions. The `ai_comparison` field is designed to hold the full `ComparativeAnalysis` object as a JSONB blob, and `share_token` can be null if the comparison has not yet been made public.
 */
export interface SavedComparisonRow {
  id: string
  user_id: string
  session_id_a: string
  session_id_b: string
  /** JSONB blob — the full ComparativeAnalysis object. */
  ai_comparison: ComparativeAnalysis
  /** Opaque token for the public /shared/compare/[token] route; null if not shared yet. */
  share_token: string | null
  created_at: string
}

/**
 * Domain-level saved comparison object (camelCase).
 * Returned by POST /api/compare/analysis and GET /api/compare/share.
 */
/**
 * Domain-level saved comparison object (camelCase).
 * Returned by POST /api/compare/analysis and GET /api/compare/share.
 *
 * What it does: This interface represents a saved session comparison at the application's domain level, typically for API responses and frontend consumption.
 * Why it is used: It provides a clean, camelCase representation of a saved comparison, transforming the raw database row (`SavedComparisonRow`) into an object that aligns with common JavaScript/TypeScript coding conventions, making it easier to work with in the application.
 * Important implementation details: It maps and renames fields from `SavedComparisonRow` to camelCase (e.g., `session_id_a` to `sessionIdA`). The `aiComparison` field holds the processed `ComparativeAnalysis` object. It's used when fetching or posting saved comparison data via API endpoints.
 */
export interface SavedComparison {
  id: string
  userId: string
  sessionIdA: string
  sessionIdB: string
  /** The AI narrative and structured differences for this comparison. */
  aiComparison: ComparativeAnalysis
  /** Opaque token for the public /shared/compare/[token] route; null if not shared yet. */
  shareToken: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Cohort/semester comparison types
// ---------------------------------------------------------------------------

/**
 * Aggregate statistics for a single semester in a cohort comparison.
 * One entry per semester in the comparison set.
 */
/**
 * Aggregate statistics for a single semester in a cohort comparison.
 * One entry per semester in the comparison set.
 *
 * What it does: This interface provides a summary of key statistics and characteristics for a single academic semester within a multi-semester (cohort) comparison context.
 * Why it is used: It allows for a standardized way to represent and compare individual semester performance, engagement, and thematic trends when evaluating overall cohort progress or curriculum effectiveness.
 * Important implementation details: Includes derived metrics such as `sessionCount`, `studentCount`, `avgSubmissions`, and `topThemes`, which are typically calculated by backend services from raw session data.
 */
export interface SemesterComparisonStats {
  id: string
  name: string
  /** Number of sessions (speaker visits) in this semester. */
  sessionCount: number
  /** Number of unique students who submitted at least once. */
  studentCount: number
  /** Mean number of submissions per session across this semester. */
  avgSubmissions: number
  /** Most frequent theme titles across all sessions in this semester. */
  topThemes: string[]
}

/**
 * A theme that recurred across multiple semesters.
 * Used to show which topics are perennially relevant to the class.
 */
/**
 * A theme that recurred across multiple semesters.
 * Used to show which topics are perennially relevant to the class.
 *
 * What it does: This interface identifies and quantifies the recurrence of specific themes across different academic semesters.
 * Why it is used: It highlights topics that consistently appear as important or relevant over time, providing insights into enduring curriculum focus, student interests, or recurring challenges. This is valuable for curriculum planning and long-term analysis.
 * Important implementation details: It lists the `theme` title, the `semesterIds` where it was identified, and the `totalOccurrences` across all sessions within those semesters, giving a measure of its overall prominence.
 */
export interface ThemePersistence {
  /** The theme title. */
  theme: string
  /** IDs of the semesters this theme appeared in. */
  semesterIds: string[]
  /** Total number of sessions (across all semesters) where this theme appeared. */
  totalOccurrences: number
}

/**
 * Full cohort comparison payload returned by GET /api/semesters/compare.
 * Aggregates per-semester stats, AI narrative, and recurring theme data.
 */
/**
 * Full cohort comparison payload returned by GET /api/semesters/compare.
 * Aggregates per-semester stats, AI narrative, and recurring theme data.
 *
 * What it does: This interface defines the complete data structure for a comparison across multiple academic semesters (cohorts).
 * Why it is used: It serves as the main data payload returned by the `/api/semesters/compare` endpoint, supplying all the necessary information to render a comprehensive cohort comparison page in the frontend, including individual semester statistics, AI-generated insights, and persistent themes.
 * Important implementation details: It combines an array of `SemesterComparisonStats`, an optional `aiNarrative` (which is typically Gemini-generated), and an array of `ThemePersistence` objects to provide a holistic view of the cohort comparison.
 */
export interface CohortComparisonData {
  semesters: SemesterComparisonStats[]
  /** Gemini-generated narrative comparing the cohorts; present when generated. */
  aiNarrative?: string
  /** Themes that appeared in more than one semester. */
  themePersistence: ThemePersistence[]
}

/** Raw database row for the `cohort_comparisons` table. */
/**
 * Raw database row for the `cohort_comparisons` table.
 *
 * What it does: This interface directly corresponds to the schema of the `cohort_comparisons` table in the database.
 * Why it is used: It defines the exact structure for storing and retrieving cohort comparison records from the database, ensuring type safety and consistency during database operations.
 * Important implementation details: Uses snake_case for field names to match database column conventions. The `semester_ids` field stores an array of identifiers for the semesters included in the comparison, and the `analysis` field holds the full `CohortComparisonData` object as a JSONB blob.
 */
export interface CohortComparisonRow {
  id: string
  user_id: string
  /** Array of semester IDs included in this comparison. */
  semester_ids: string[]
  /** JSONB blob — the full CohortComparisonData object. */
  analysis: CohortComparisonData
  created_at: string
}

/**
 * Domain-level cohort comparison object (camelCase).
 * Returned by GET /api/semesters/compare and rendered on /analytics/compare.
 */
/**
 * Domain-level cohort comparison object (camelCase).
 * Returned by GET /api/semesters/compare and rendered on /analytics/compare.
 *
 * What it does: This interface represents a saved cohort comparison at the application's domain level, typically for API responses and frontend consumption.
 * Why it is used: It provides a clean, camelCase representation of a saved cohort comparison, transforming the raw database row (`CohortComparisonRow`) into an object that is more idiomatic for JavaScript/TypeScript, making it easier to integrate into application logic and UI components.
 * Important implementation details: It maps and renames fields from `CohortComparisonRow` to camelCase (e.g., `user_id` to `userId`). The `analysis` field contains the comprehensive `CohortComparisonData` object. It is used by API endpoints like `GET /api/semesters/compare` and consumed by frontend pages such as `/analytics/compare`.
 */
export interface CohortComparison {
  id: string
  userId: string
  /** Semester IDs included in this comparison. */
  semesterIds: string[]
  /** The full comparison analysis including AI narrative and theme persistence. */
  analysis: CohortComparisonData
  createdAt: string
}
