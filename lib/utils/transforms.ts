/**
 * Database row → domain type transform utilities.
 *
 * Supabase returns rows in snake_case matching the Postgres column names. The rest of
 * the application uses camelCase domain types (defined in `types/`). These pure functions
 * perform that translation in one place so db layer functions (`lib/db/`) stay clean and
 * the UI never directly imports raw DB row shapes.
 *
 * Add a new transform here whenever a new `*Row` → domain type mapping is needed.
 * Always coerce nullable FK columns (e.g. `semester_id`) to `null` rather than `undefined`
 * so the domain types stay consistent.
 */
import type { SessionRow, Session, SessionSummary, SessionDebriefRow, SessionDebrief } from '@/types'

/**
 * Converts a raw `sessions` table row into the full `Session` domain type.
 *
 * Includes the AI-generated `output` field — use this transform when the caller needs
 * the complete session content (e.g. the `/preview` page, download routes).
 *
 * @param row - A raw row from the `sessions` Supabase table.
 */
/**
 * Converts a raw `sessions` table row into the full `Session` domain type.
 *
 * Includes the AI-generated `output` field — use this transform when the caller needs
 * the complete session content (e.g. the `/preview` page, download routes).
 *
 * @param row - A raw row from the `sessions` Supabase table.
 */
export function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    speakerName: row.speaker_name,
    createdAt: row.created_at,
    output: row.output,
    fileCount: row.file_count,
    // Coerce undefined to null so the domain type is consistently nullable
    semesterId: row.semester_id ?? null,
    promptVersionId: row.prompt_version_id ?? null,
  }
}

/**
 * Converts a raw `sessions` table row into the lightweight `SessionSummary` domain type.
 *
 * Omits `output` (the full AI text) to keep list payloads small. `debriefStatus` and
 * `debriefRating` are set to `null` here — callers that need debrief data should join
 * them separately via `getDebriefStatusesBySessionIds()`.
 *
 * @param row - A raw row from the `sessions` Supabase table.
 */
/**
 * Converts a raw `sessions` table row into the lightweight `SessionSummary` domain type.
 *
 * Omits `output` (the full AI text) to keep list payloads small. `debriefStatus` and
 * `debriefRating` are set to `null` here — callers that need debrief data should join
 * them separately via `getDebriefStatusesBySessionIds()`.
 *
 * @param row - A raw row from the `sessions` Supabase table.
 */
export function rowToSessionSummary(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    speakerName: row.speaker_name,
    createdAt: row.created_at,
    fileCount: row.file_count,
    semesterId: row.semester_id ?? null,
    // Debrief fields are not available from the sessions table alone; populate externally
    debriefStatus: null,
    debriefRating: null,
  }
}

/**
 * Converts a raw `session_debriefs` table row into the `SessionDebrief` domain type.
 *
 * @param row - A raw row from the `session_debriefs` Supabase table.
 */
/**
 * Converts a raw `session_debriefs` table row into the `SessionDebrief` domain type.
 *
 * @param row - A raw row from the `session_debriefs` Supabase table.
 */
export function rowToDebrief(row: SessionDebriefRow): SessionDebrief {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    overallRating: row.overall_rating,
    questionsFeedback: row.questions_feedback,
    surpriseMoments: row.surprise_moments,
    speakerFeedback: row.speaker_feedback,
    studentObservations: row.student_observations,
    followupTopics: row.followup_topics,
    privateNotes: row.private_notes,
    aiSummary: row.ai_summary,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
