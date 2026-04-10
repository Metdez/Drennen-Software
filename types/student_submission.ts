/**
 * @file types/student_submission.ts
 * @description Student submission types — the raw input data extracted from ZIP uploads.
 *
 * When a professor uploads a Canvas ZIP, each student file is parsed and stored
 * as a `StudentSubmission`. Student names are derived from the Canvas filename
 * format `FirstName_LastName_...` and normalised to `"FirstName L."` for display.
 *
 * This file also contains roster-level types used on the /roster pages, which
 * aggregate submission data across sessions for a per-student profile view.
 *
 * Submission data is stored in `student_submissions` and accessed through:
 *   (internal) created during POST /api/process pipeline
 *   GET /api/roster                       → StudentSummary[] (participation list)
 *   GET /api/roster/[studentName]         → StudentDetail (per-student sessions)
 *
 * Row vs Domain:
 *   StudentSubmissionRow — raw Supabase row (snake_case, `student_submissions` table)
 *   StudentSubmission    — camelCase domain object
 */

/** Raw database row for the `student_submissions` table. */
/**
 * Represents the database schema for a student's submission.
 *
 * What it does: Defines the structure of a student submission as it is stored in the database.
 * Why it is used: Provides a type-safe contract for database interactions, ensuring data consistency when reading from or writing to the `student_submissions` table.
 * Important implementation details: Uses `snake_case` for all property names to align with typical SQL database column naming conventions. Includes fields for unique identification, session linkage, student identification, file original name, raw content, and creation timestamp.
 */
export interface StudentSubmissionRow {
  id: string
  session_id: string
  /** Normalised display name derived from the Canvas filename (e.g. "Jane S."). */
  student_name: string
  /** Original filename from the ZIP, used for debugging and display. */
  filename: string
  /** Raw parsed text content of the student's submission file. */
  submission_text: string
  created_at: string
}

/**
 * Domain-level student submission object (camelCase).
 * Used when displaying individual student submissions on the roster detail page.
 */
/**
 * Represents a student's submission at the domain or application level.
 *
 * What it does: Defines the structure of a student submission object used within the application's business logic and for display in user interfaces.
 * Why it is used: Provides a clean, `camelCase` representation of student submission data that is easier to work with in JavaScript/TypeScript code and typically aligns with frontend data models. It's the primary object used when displaying individual student submissions on detail pages.
 * Important implementation details: Uses `camelCase` for all property names, converting from the `snake_case` used in `StudentSubmissionRow` during data retrieval or transformation. Includes core submission details like ID, session ID, student name, filename, submission text, and creation timestamp.
 */
export interface StudentSubmission {
  id: string
  sessionId: string
  /** Normalised display name (e.g. "Jane S."). */
  studentName: string
  /** Original filename from the ZIP. */
  filename: string
  /** Raw parsed text content of the student's submission. */
  submissionText: string
  createdAt: string
}

/**
 * Input shape for bulk-inserting student submissions after ZIP processing.
 * All students from a single session are inserted together.
 * Used internally by the POST /api/process pipeline.
 */
/**
 * Defines the input shape for bulk-inserting student submissions into the system.
 *
 * What it does: Specifies the data structure expected by an API endpoint (e.g., `POST /api/process`) responsible for handling the creation of multiple student submissions, typically after a ZIP file has been processed.
 * Why it is used: Provides a clear, type-safe contract for the API input, ensuring that all necessary data for creating new submissions is provided and correctly structured. It's optimized for inserting all students from a single session simultaneously.
 * Important implementation details: It expects a `sessionId` to link all submissions to a common session and an array of `students`, each containing their `name`, `filename`, and `rawText`.
 */
export interface CreateStudentSubmissionsInput {
  sessionId: string
  students: Array<{ name: string; filename: string; rawText: string }>
}

// ── Roster types ──────────────────────────────────────────────────────────────

/**
 * Lightweight student summary for the /roster list view.
 * One entry per unique student across all sessions for the professor.
 */
/**
 * Represents a lightweight summary of a student, primarily for display in list views.
 *
 * What it does: Provides aggregated information about a student, suitable for a roster list where detailed submission content is not immediately needed.
 * Why it is used: Optimizes performance for list displays (e.g., `/roster`) by providing only essential information, avoiding the need to fetch and process full submission details for every student. It offers a quick overview of a student's engagement and status.
 * Important implementation details: Includes the student's name, their submission count, the total available sessions (for participation rate calculation), and optional fields like `growthSignal` (from AI profile) and `flaggedForFollowup` for quick insights and actionability. It aggregates data across all sessions for a given student.
 */
export interface StudentSummary {
  studentName: string
  /** Number of sessions this student submitted to. */
  sessionCount: number
  /** Total sessions available for this professor (used to compute participation rate). */
  totalSessions: number
  /**
   * Denormalised growth signal label from the student's AI profile
   * (e.g. 'Accelerating', 'Plateauing'). Present only if a profile has been generated.
   */
  growthSignal?: string
  /** Whether the professor has flagged this student for follow-up. */
  flaggedForFollowup?: boolean
}

/**
 * A session entry in a student's submission history, enriched with additional
 * submission types beyond the original questions.
 * Used in the StudentDetail sessions list on /roster/[studentName].
 */
/**
 * Represents a single session entry within a student's submission history, enriched with various submission types.
 *
 * What it does: Provides a detailed view of a student's engagement in a specific session, including their original question submission and potentially other supplementary texts like debriefs or speaker analyses.
 * Why it is used: Used when rendering a student's individual detail page (e.g., `/roster/[studentName]`) to display a chronological list of their submissions across different sessions. It consolidates all relevant text submissions for a given session into one object.
 * Important implementation details: Includes core session metadata (`sessionId`, `speakerName`, `createdAt`) alongside the primary `submissionText` and `filename`. It also includes optional fields (`debriefText`, `speakerAnalysisText`) to account for different types of submissions a student might make for a session.
 */
export interface SessionWithSubmission {
  sessionId: string
  speakerName: string
  createdAt: string
  /** Raw text from the student's original question submission for this session. */
  submissionText: string
  /** Original filename from the ZIP. */
  filename: string
  /** Raw text from the student's debrief reflection, if submitted. */
  debriefText?: string
  /** Raw text from the student's speaker analysis, if submitted. */
  speakerAnalysisText?: string
}

/**
 * Full per-student detail including their complete session submission history.
 * Returned by GET /api/roster/[studentName] and rendered on /roster/[studentName].
 */
/**
 * Represents the comprehensive detail object for a single student.
 *
 * What it does: Provides a full profile of a student, including all their submission history across various sessions and aggregated statistics.
 * Why it is used: Serves as the data model for rendering a dedicated student detail page (e.g., returned by `GET /api/roster/[studentName]`), allowing a professor to review a student's complete engagement and progress.
 * Important implementation details: Contains the `studentName`, an ordered list of `sessions` (using `SessionWithSubmission` for detailed per-session information), and summary statistics such as `sessionCount` and `totalSessions` to provide context on the student's overall participation.
 */
export interface StudentDetail {
  studentName: string
  /** Ordered list of sessions where this student has any submission type. */
  sessions: SessionWithSubmission[]
  /** Number of sessions this student submitted to. */
  sessionCount: number
  /** Total sessions available for this professor. */
  totalSessions: number
}
