/**
 * @file types/session.ts
 * @description Core session types — the central entity of the app.
 *
 * A "session" is created each time a professor uploads a Canvas ZIP for a
 * guest speaker. The AI processes student submissions and produces a 10-section
 * interview sheet stored in `output`. Sessions are intentionally immutable
 * (no UPDATE/DELETE RLS policies exist on the DB table).
 *
 * Row vs Domain:
 *   SessionRow  — raw Supabase row shape (snake_case, mirrors `sessions` table)
 *   Session     — camelCase domain object used throughout the app
 *
 * Related routes:
 *   GET  /api/sessions          → returns SessionSummary[]
 *   GET  /api/sessions/[id]     → returns Session (via GetSessionResponse)
 *   POST /api/process           → creates a session, returns ProcessResponse
 */

/** Raw database row for the `sessions` table. */
/**
 * What it does: Represents the raw structure of a session record as stored in the database.
 * Why it is used: To strongly type data retrieved directly from the database's `sessions` table, ensuring strict adherence to the schema and facilitating type-safe data access.
 * Important implementation details: Uses snake_case naming convention for its properties to directly match the database column names. Includes foreign keys `semester_id` and `prompt_version_id` which can be NULL, indicating unassigned status or use of a default.
 */
export interface SessionRow {
  id: string
  user_id: string
  speaker_name: string
  created_at: string
  /** Full AI-generated markdown output (10-section interview sheet). */
  output: string
  /** Number of student files parsed from the uploaded ZIP. */
  file_count: number
  /** FK to `semesters.id`; NULL means this session is unassigned. */
  semester_id: string | null
  /** FK to `custom_system_prompts.id`; NULL means the built-in default prompt was used. */
  prompt_version_id: string | null
}

/**
 * Domain-level session object (camelCase).
 * Returned by `getSessionById()` and used in most UI components and API responses.
 */
/**
 * What it does: Represents the domain-level session object used throughout the application.
 * Why it is used: To provide a consistent, camelCase representation of a session across the application's business logic, API responses, and UI components. This abstracts away database-specific naming conventions and is the primary object for application-level operations.
 * Important implementation details: Uses camelCase for properties, transforming from `SessionRow`'s snake_case. It's the most common session type used in the front-end and API layers.
 */
export interface Session {
  id: string
  userId: string
  speakerName: string
  createdAt: string
  /** Full AI-generated markdown output (10-section interview sheet). */
  output: string
  /** Number of student files parsed from the uploaded ZIP. */
  fileCount: number
  /** FK to the semester this session belongs to; null if unassigned. */
  semesterId: string | null
  /** FK to the custom prompt version used; null if the built-in default prompt was used. */
  promptVersionId: string | null
}

/**
 * Input shape for inserting a new session via `insertSession()` in lib/db/sessions.ts.
 * Called from POST /api/process after the AI pipeline completes.
 */
/**
 * What it does: Defines the input shape required for creating a new session.
 * Why it is used: To enforce type safety and clarity when inserting new session records, typically via an API endpoint. It ensures that only the necessary and correctly typed data is provided during the session creation process.
 * Important implementation details: Uses camelCase. Fields like `semesterId` and `promptVersionId` are optional (`?`) and nullable, as they might not be specified at the time a session is initially created.
 */
export interface CreateSessionInput {
  userId: string
  speakerName: string
  output: string
  fileCount: number
  semesterId?: string | null
  promptVersionId?: string | null
}

/**
 * Lightweight session summary used in list views (history page, analytics, comparison picker).
 * Does NOT include the full `output` field — use `Session` when you need the AI text.
 * Returned by GET /api/sessions.
 */
/**
 * What it does: Provides a lightweight summary of a session, optimized for display in list views.
 * Why it is used: To efficiently fetch and display essential session information in contexts like history pages, analytics dashboards, or comparison pickers, without incurring the overhead of retrieving the potentially large `output` field when it's not needed.
 * Important implementation details: Explicitly excludes the `output` field. Includes `debriefStatus` and `debriefRating` to provide quick insights into post-session activities and feedback, depending on `DebriefStatus` from `./debrief`.
 */
export interface SessionSummary {
  id: string
  speakerName: string
  createdAt: string
  /** Number of student files in the session's ZIP. */
  fileCount: number
  /** FK to the semester this session belongs to; null if unassigned. */
  semesterId: string | null
  /** Whether a post-session debrief exists and its completion state; null if no debrief yet. */
  debriefStatus: import('./debrief').DebriefStatus | null
  /** The professor's 1–5 star rating from the debrief, if completed. */
  debriefRating: number | null
}

/** Raw database row for the `session_shares` table. */
/**
 * What it does: Represents the raw database structure for a session share record.
 * Why it is used: To strongly type data retrieved directly from the `session_shares` table in the database, ensuring consistency with the table's schema and facilitating type-safe database operations.
 * Important implementation details: Uses snake_case naming convention to match database column names. The `share_token` field is a unique identifier used to generate public URLs for shared sessions.
 */
export interface SessionShareRow {
  id: string
  session_id: string
  user_id: string
  /** Opaque token used in the public share URL: /shared/[token] */
  share_token: string
  created_at: string
}

/**
 * Domain-level session share object.
 * Created by POST /api/sessions/[id]/share and fetched by GET /api/sessions/[id]/share.
 * The token powers the public /shared/[token] route (no auth required).
 */
/**
 * What it does: Represents the domain-level object for a session share.
 * Why it is used: To provide a consistent, camelCase representation of a session share for application logic and API responses. This object is used to manage and expose session sharing functionality, particularly for generating and accessing public share links.
 * Important implementation details: Uses camelCase for properties. The `shareToken` is a crucial field that powers the public `/shared/[token]` route, allowing unauthenticated access to shared session content.
 */
export interface SessionShare {
  id: string
  sessionId: string
  /** Opaque token used in the public share URL: /shared/[token] */
  shareToken: string
  createdAt: string
}
