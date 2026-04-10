/**
 * @file types/analytics.ts
 * @description Analytics aggregation types for the /analytics dashboard.
 *
 * These types represent computed views over session and submission data —
 * they are NOT direct DB row shapes. The data is assembled server-side by
 * `lib/db/analytics.ts` (`getAnalytics()`) and returned by:
 *   GET /api/analytics
 *
 * Rendered in the /analytics page (submission trend chart, student leaderboard,
 * drop-off table) and reused in some report sections.
 *
 * All types here are Domain types (camelCase, no DB Row equivalent).
 */

/**
 * Per-session summary row for the submission trend chart.
 * One entry per session in the professor's history.
 */
/**
 * Describes a single row of analytics data for a specific session.
 *
 * It is used to populate session trend charts and provide an overview of individual session performance within the analytics dashboard.
 *
 * Key fields include `sessionId`, `speakerName`, the session `date`, `submissionCount`, a flag `hasStudentData` indicating if any submissions exist, and `relativeSubmissionRate` which benchmarks submissions against the professor's average.
 */
export interface SessionAnalyticsRow {
  sessionId: string
  speakerName: string
  /** ISO date string of when the session was created. */
  date: string
  /** Number of student files submitted for this session. */
  submissionCount: number
  /** Whether any student submission records exist for this session. */
  hasStudentData: boolean
  /**
   * Submission count relative to the professor's average across all sessions.
   * A value of 1.0 means exactly average; >1 is above average.
   */
  relativeSubmissionRate: number
}

/**
 * Single entry in the all-time student participation leaderboard.
 * Students are ranked by how many sessions they submitted to.
 */
/**
 * Represents a single entry in the all-time student participation leaderboard.
 *
 * It is used to rank students based on their engagement, specifically by the total number of sessions they submitted questions to.
 *
 * Each entry includes the `studentName` and their aggregate `submissionCount` across all sessions.
 */
export interface LeaderboardEntry {
  studentName: string
  /** Total number of sessions for which this student submitted questions. */
  submissionCount: number
}

/**
 * A student who was active in early sessions but has not submitted recently.
 * Used in the drop-off analysis table on the /analytics page.
 */
/**
 * Defines a student who showed early engagement but has since ceased active participation.
 *
 * This interface is used to identify and display students for the drop-off analysis table on the `/analytics` page, helping to highlight potentially disengaged students.
 *
 * It captures the `studentName`, details about their `lastSeenSpeaker` and `lastSeenDate`, and their `earlySessionCount` to quantify initial engagement.
 */
export interface DropoffEntry {
  studentName: string
  /** Name of the speaker for the last session the student participated in. */
  lastSeenSpeaker: string
  /** ISO date string of the last session the student participated in. */
  lastSeenDate: string
  /** Number of sessions the student submitted to in the first half of the semester. */
  earlySessionCount: number
}

/**
 * Full analytics payload returned by GET /api/analytics.
 * Combines session trend data, leaderboard, drop-off list, and aggregate metadata.
 */
/**
 * Represents the complete payload of analytics information returned by the `/api/analytics` endpoint.
 *
 * It is used as the primary data structure for the frontend analytics page, consolidating various insights such as session trends, student leaderboards, drop-off analysis, and overall aggregate metrics.
 *
 * This comprehensive structure includes `sessions` (an array of `SessionAnalyticsRow`), `leaderboard` (an array of `LeaderboardEntry`), `dropoff` (an array of `DropoffEntry`), and `meta` data containing high-level statistics like `totalSessions`, `totalUniqueStudents`, `hasAnyStudentData`, and `avgRelativeRate`.
 */
export interface AnalyticsData {
  /** Per-session rows for the submission trend chart. */
  sessions: SessionAnalyticsRow[]
  /** Top participating students, sorted by submission count descending. */
  leaderboard: LeaderboardEntry[]
  /** Students whose participation dropped off partway through the semester. */
  dropoff: DropoffEntry[]
  /** High-level aggregate metrics shown at the top of the analytics page. */
  meta: {
    totalSessions: number
    totalUniqueStudents: number
    /** False if no sessions have student submission records yet. */
    hasAnyStudentData: boolean
    /** Mean relative submission rate across all sessions (benchmark: 1.0). */
    avgRelativeRate: number
  }
}
