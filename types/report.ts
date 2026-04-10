/**
 * @file types/report.ts
 * @description Semester report types — data-driven end-of-semester documents.
 *
 * Semester reports are generated on-demand by `lib/ai/reportAgent.ts`
 * (`generateSemesterReport()`), stored for retrieval, and exportable as
 * PDF or DOCX. They differ from stories (see story.ts) in that they are
 * data-driven (metrics, charts, rankings) rather than narrative-driven.
 *
 * Reports are accessed through:
 *   POST /api/reports/generate      → triggers generation, returns SemesterReport
 *   GET  /api/reports/[id]          → fetch a stored report
 *   GET  /api/reports/[id]/download → export as PDF or DOCX
 *
 * Rendered on /reports/[id] and within portfolio shares (if `includeReports` is true).
 *
 * Row vs Domain:
 *   SemesterReportRow — raw Supabase row (snake_case, `semester_reports` table)
 *   SemesterReport    — camelCase domain object used in the app
 *
 * The bulk of the file defines the individual section types that compose
 * `ReportContent`. Each section is optional so reports can be generated with
 * a subset of sections based on data availability or professor preference.
 */

/**
 * Professor-provided configuration for report generation.
 * Controls which sections are included and provides optional metadata.
 */
/**
 * Defines the configuration parameters for generating a semester report.
 *
 * It is used to allow users or the system to specify how a report should be generated, including its title, date range, and which sections to include.
 *
 * Important implementation details: It includes a mandatory `title`, an optional `dateRange` for filtering sessions, `includedSections` as an array of string keys, and an optional `customNotes` field for professor-authored content.
 */
export interface ReportConfig {
  /** Report title shown on the cover page. */
  title: string
  /**
   * Optional date range for filtering sessions included in the report.
   * Null means include all sessions in the selected semester.
   */
  dateRange: { start: string; end: string } | null
  /** List of section keys to include (e.g. ['executive_summary', 'theme_evolution']). */
  includedSections: string[]
  /** Optional professor-authored notes appended to the report. */
  customNotes?: string
}

// ── Section data types ──

/**
 * High-level overview section with key metrics and highlight callouts.
 * Always included when generating a full report.
 */
/**
 * Represents the data for the executive summary section of a semester report.
 *
 * It is used to provide a high-level overview of the semester, including AI-generated narratives, key highlights, and important statistical metrics.
 *
 * Important implementation details: This section contains an AI-generated `narrative`, bullet-point `highlights` for quick consumption, and `keyMetrics` such as total sessions, submissions, students, average submissions, and participation rate. This section is generally always included when generating a full report.
 */
export interface ExecutiveSummarySection {
  /** AI-generated narrative paragraph summarising the semester. */
  narrative: string
  /** Bullet-point highlights for the cover/summary page. */
  highlights: string[]
  keyMetrics: {
    totalSessions: number
    totalSubmissions: number
    totalStudents: number
    avgSubmissionsPerSession: number
    /** Percentage of enrolled students who submitted at least once. */
    participationRate: number
  }
}

/**
 * At-a-glance statistics section: session timeline, counts, and tier distribution.
 */
/**
 * Defines the data structure for the "Semester at a Glance" section within a semester report.
 *
 * It is used to display quick, high-level statistics about the semester's activities, including session timelines, submission counts, and the distribution of question quality tiers.
 *
 * Important implementation details: It includes `totalSessions`, `totalSubmissions`, `totalStudents`, `avgSubmissionsPerSession`, an `sessionsOverTime` array for timeline visualization, and a `tierDistribution` record mapping question quality tiers to their counts.
 */
export interface SemesterGlanceSection {
  totalSessions: number
  totalSubmissions: number
  totalStudents: number
  avgSubmissionsPerSession: number
  /** Ordered list of sessions for the semester timeline chart. */
  sessionsOverTime: Array<{
    speakerName: string
    date: string
    submissionCount: number
  }>
  /**
   * Distribution of question quality tiers across all sessions.
   * Keys are tier numbers as strings ('1'–'4'); values are total counts.
   */
  tierDistribution: Record<string, number>
}

/**
 * Summary card for a single session within the report's session summaries section.
 */
/**
 * Represents a summarized view of a single session within the report's session summaries section.
 *
 * It is used to provide concise details about individual sessions, enabling users to quickly grasp key information like speaker, date, submission count, and identified themes.
 *
 * Important implementation details: It includes `sessionId`, `speakerName`, `date`, `fileCount` (number of student submissions), extracted `themes`, and optional `debriefRating` and `debriefHighlights` if a debrief was completed.
 */
export interface SessionSummaryEntry {
  sessionId: string
  speakerName: string
  date: string
  /** Number of student files submitted for this session. */
  fileCount: number
  /** Theme titles extracted from the session's AI output. */
  themes: string[]
  /** Professor's 1–5 star rating from the debrief; null if no debrief. */
  debriefRating: number | null
  /** Key highlights from the debrief AI summary; null if no debrief. */
  debriefHighlights: string | null
}

/** List of per-session summary cards. */
/**
 * Defines the structure for a section containing a list of individual session summaries.
 *
 * It is used to aggregate and present an overview of all included sessions in the report, allowing for easy navigation and review of each session's key details.
 *
 * Important implementation details: It contains a single property, `sessions`, which is an array of `SessionSummaryEntry` objects.
 */
export interface SessionSummariesSection {
  sessions: SessionSummaryEntry[]
}

/**
 * How recurring themes evolved across sessions throughout the semester.
 * Shows a timeline of which themes appeared in which sessions and identifies
 * the themes that dominated most.
 */
/**
 * Describes how recurring themes developed and evolved across sessions throughout the semester.
 *
 * It is used to analyze and visualize the progression of academic themes, identifying dominant topics, their appearance frequency, and their spread across sessions over time.
 *
 * Important implementation details: It includes an AI-generated `narrative` explaining theme development, a `timeline` array showing themes per session, and `dominantThemes` array detailing themes with highest total occurrence, including their first and last seen dates.
 */
export interface ThemeEvolutionSection {
  /** AI-generated narrative describing how themes developed over the semester. */
  narrative: string
  /** Ordered session-by-session theme data for the timeline visualisation. */
  timeline: Array<{
    sessionId: string
    speakerName: string
    date: string
    themes: string[]
  }>
  /** Themes with the highest total occurrence across all sessions. */
  dominantThemes: Array<{
    title: string
    /** Total number of sessions this theme appeared in. */
    totalCount: number
    /** ISO date string of the first session this theme appeared in. */
    firstSeen: string
    /** ISO date string of the most recent session this theme appeared in. */
    lastSeen: string
  }>
}

/**
 * Student participation breakdown across the semester.
 * Groups students into high/medium/low tiers and identifies drop-off patterns.
 */
/**
 * Provides a comprehensive breakdown of student participation and engagement patterns across the semester.
 *
 * It is used to assess overall student involvement, identify highly active students, and detect potential drop-off trends in participation, offering insights into student behavior.
 *
 * Important implementation details: It includes `totalStudents`, `participationTiers` (bucketing students into high/medium/low engagement), a `topContributors` array for most active students, and a `dropoff` array identifying students who stopped submitting.
 */
export interface StudentEngagementSection {
  totalStudents: number
  /**
   * Students bucketed by participation rate.
   * high: 80%+ of sessions, medium: 50–79%, low: below 50%.
   */
  participationTiers: {
    high: number    // 80%+
    medium: number  // 50-80%
    low: number     // below 50%
  }
  /** Most active students by session count. */
  topContributors: Array<{
    studentName: string
    /** Number of sessions this student submitted to. */
    sessionCount: number
    /** Total sessions available in the semester. */
    totalSessions: number
    /** Participation rate as a decimal (0–1). */
    rate: number
  }>
  /** Students who submitted in early sessions but stopped later. */
  dropoff: Array<{
    studentName: string
    lastSeenSpeaker: string
    lastSeenDate: string
  }>
}

/**
 * AI-generated growth highlight for a single student.
 * Used in the student growth section of the report.
 */
/**
 * Represents an AI-generated highlight describing a single student's intellectual growth trajectory.
 *
 * It is used within the student growth section of the report to provide specific examples and narratives of individual student development, making the overall growth analysis more concrete.
 *
 * Important implementation details: It includes the `studentName`, an AI-generated `narrative` of their growth, `sessionsParticipated`, and optional fields for a denormalized `growthSignal` (e.g., 'Accelerating') and `thinkingProgression` description.
 */
export interface StudentGrowthHighlight {
  studentName: string
  /** Narrative description of this student's growth trajectory. */
  narrative: string
  /** Number of sessions this student participated in. */
  sessionsParticipated: number
  /** Denormalized growth signal label (e.g. 'Accelerating', 'Plateauing'). */
  growthSignal?: string
  /** Description of how this student's thinking sophistication changed over the semester. */
  thinkingProgression?: string
}

/**
 * Overview of student intellectual growth across the semester.
 * Powered by student profile data generated by `lib/ai/studentProfile.ts`.
 */
/**
 * Defines the data for the "Student Growth" section of the semester report.
 *
 * It is used to provide an overview of student intellectual growth across the entire class, summarizing class-wide patterns with an AI-generated narrative and highlighting individual student growth stories.
 *
 * Important implementation details: It contains an AI-generated `narrative` summarizing class-wide growth, and an array of `highlights`, where each element is a `StudentGrowthHighlight` for an individual student.
 */
export interface StudentGrowthSection {
  /** AI-generated narrative summarising class-wide growth patterns. */
  narrative: string
  /** Highlighted individual student growth stories. */
  highlights: StudentGrowthHighlight[]
}

/**
 * Analysis of how question quality evolved over the semester.
 * Combines AI narrative with per-session tier breakdowns.
 */
/**
 * Provides an analysis of how question quality evolved over the semester, combining AI narrative with per-session tier breakdowns.
 *
 * It is used to track and report on the overall quality of student questions, identify improving or declining trends, and illustrate quality distribution both per session and aggregately.
 *
 * Important implementation details: It includes an AI-generated `narrative` describing quality trends, an overall `trend` status ('improving', 'declining', 'stable'), `perSessionTiers` for a detailed timeline, and an `overallDistribution` for aggregate quality tier counts across the report's sessions.
 */
export interface QuestionQualitySection {
  /** AI-generated narrative describing quality trends. */
  narrative: string
  /** Overall quality trajectory across the semester. */
  trend: 'improving' | 'declining' | 'stable'
  /** Per-session tier counts for the quality trend chart. */
  perSessionTiers: Array<{
    sessionId: string
    speakerName: string
    date: string
    /**
     * Tier counts for this session.
     * Keys are tier numbers as strings ('1'–'4').
     */
    tierCounts: Record<string, number>
  }>
  /**
   * Aggregate tier distribution across all sessions in the report.
   * Keys are tier numbers as strings ('1'–'4').
   */
  overallDistribution: Record<string, number>
}

/**
 * Topics and perspectives that students consistently avoided or missed.
 * Includes actionable recommendations for future sessions.
 */
/**
 * Details topics, perspectives, or areas of understanding that students consistently avoided, missed, or struggled with throughout the semester.
 *
 * It is used to identify gaps in student comprehension or curriculum coverage and to provide actionable recommendations for instructors to address these areas in future sessions or curriculum adjustments.
 *
 * Important implementation details: It consists of an array of `blindSpots`, each with a `title` and `description`, and an array of `recommendations` with specific `text` and a `reason` for each suggestion.
 */
export interface BlindSpotsSection {
  blindSpots: Array<{
    title: string
    description: string
  }>
  recommendations: Array<{
    text: string
    reason: string
  }>
}

/**
 * Rankings entry for a single speaker session.
 * Used to build the speaker effectiveness comparison table.
 */
/**
 * Represents a single entry for a speaker session within the speaker effectiveness comparison table.
 *
 * It is used to provide key metrics for an individual speaker session, allowing for comparison and ranking against other sessions based on factors like debrief ratings and question quality.
 *
 * Important implementation details: It includes `speakerName`, `sessionId`, `date`, an optional `debriefRating` (1-5 stars), an optional `avgTier` (1-4, lower is better), and `submissionCount` for the session.
 */
export interface SpeakerRanking {
  speakerName: string
  sessionId: string
  date: string
  /** Professor's 1–5 star debrief rating; null if no debrief was completed. */
  debriefRating: number | null
  /** Average question tier (1–4, lower is better); null if tier data unavailable. */
  avgTier: number | null
  /** Number of student submissions for this session. */
  submissionCount: number
}

/**
 * Ranked comparison of speaker sessions by effectiveness metrics.
 * Combines debrief ratings with question quality tier data.
 */
/**
 * Defines the data for the "Speaker Effectiveness" section of the report.
 *
 * It is used to provide a ranked comparison of speaker sessions based on effectiveness metrics, such as debrief ratings and question quality, complemented by an AI-generated narrative.
 *
 * Important implementation details: It contains an AI-generated `narrative` summarizing speaker effectiveness comparisons and an array of `rankings`, where each element is a `SpeakerRanking` object.
 */
export interface SpeakerEffectivenessSection {
  /** AI-generated narrative comparing speaker effectiveness. */
  narrative: string
  /** Sessions ranked by combined effectiveness score. */
  rankings: SpeakerRanking[]
}

/**
 * A student's participation record for the appendix roster table.
 */
/**
 * Represents a single student's participation record for the appendix roster table.
 *
 * It is used to provide detailed, individual student participation data, typically rendered in a tabular format within an appendix, showing who attended which sessions.
 *
 * Important implementation details: It includes the `studentName`, their `participationRate` (as a decimal), a list of `sessionsAttended` (session IDs), and the `totalSessions` available in the semester.
 */
export interface RosterEntry {
  studentName: string
  /** Participation rate as a decimal (0–1). */
  participationRate: number
  /** IDs of the sessions this student submitted to. */
  sessionsAttended: string[]
  /** Total sessions available in the semester. */
  totalSessions: number
}

/**
 * Full student roster appendix with session column headers.
 * Renders as a grid/table at the end of the report.
 */
/**
 * Defines the data for the full student roster appendix, designed to be rendered as a grid or table at the end of the report.
 *
 * It is used to present a comprehensive, session-by-session overview of student attendance and participation, offering a granular view of student engagement throughout the semester.
 *
 * Important implementation details: It contains an array of `students` (each a `RosterEntry`) and an ordered `sessionOrder` array, providing session metadata to be used as column headers for the roster table.
 */
export interface AppendixRosterSection {
  students: RosterEntry[]
  /** Ordered session metadata used as column headers in the roster table. */
  sessionOrder: Array<{ sessionId: string; speakerName: string; date: string }>
}

// ── Full report content ──

/**
 * The complete report content object stored as JSONB in `semester_reports.content`.
 * Each section is optional — only sections listed in `ReportConfig.includedSections`
 * will be present after generation.
 */
/**
 * The complete, structured content object for a generated semester report.
 *
 * It is used as the primary data structure for storing the full report content in a JSONB column in the database and for serving it via API endpoints. Each section is optional, depending on the `ReportConfig` used for generation.
 *
 * Important implementation details: It includes optional properties for each possible report section (e.g., `executive_summary?`), an `generatedAt` ISO timestamp indicating when the report was created, and the `config` object that was used to generate this specific report content.
 */
export interface ReportContent {
  executive_summary?: ExecutiveSummarySection
  semester_at_a_glance?: SemesterGlanceSection
  session_summaries?: SessionSummariesSection
  theme_evolution?: ThemeEvolutionSection
  student_engagement?: StudentEngagementSection
  student_growth?: StudentGrowthSection
  question_quality?: QuestionQualitySection
  blind_spots?: BlindSpotsSection
  speaker_effectiveness?: SpeakerEffectivenessSection
  appendix_roster?: AppendixRosterSection
  /** ISO timestamp of when this report content was generated. */
  generatedAt: string
  /** The configuration used when this report was generated. */
  config: ReportConfig
}

// ── DB row types ──

/** Raw database row for the `semester_reports` table. */
/**
 * Represents the raw database row schema for an entry in the `semester_reports` table.
 *
 * It is used to define the structure for storing generated semester reports directly within the PostgreSQL database, including both metadata and the full report content as JSONB.
 *
 * Important implementation details: It uses `snake_case` naming conventions typical for database columns. It includes `id`, `user_id`, `title`, `config` (JSONB), `content` (JSONB), `session_ids` (an array of strings), and `created_at` timestamp.
 */
export interface SemesterReportRow {
  id: string
  user_id: string
  title: string
  /** JSONB — the ReportConfig used to generate this report. */
  config: ReportConfig
  /** JSONB — the full ReportContent object. */
  content: ReportContent
  /** Array of session IDs included in this report. */
  session_ids: string[]
  created_at: string
}

/**
 * Domain-level semester report object (camelCase).
 * Returned by GET /api/reports/[id] and POST /api/reports/generate.
 */
/**
 * Represents the domain-level object for a semester report, typically returned by API endpoints.
 *
 * It is used to provide a clean, camelCase representation of a semester report for application logic and API consumers, transforming the raw database row into a more developer-friendly format.
 *
 * Important implementation details: It uses `camelCase` naming conventions for all properties, mirroring the `SemesterReportRow` but with adjusted field names (`userId`, `sessionIds`, `createdAt`) for consistency with frontend and service-layer expectations. It includes the full `config` and `content` objects.
 */
export interface SemesterReport {
  id: string
  userId: string
  title: string
  /** The configuration used when this report was generated. */
  config: ReportConfig
  /** The full generated report content. */
  content: ReportContent
  /** IDs of the sessions included in this report. */
  sessionIds: string[]
  createdAt: string
}
