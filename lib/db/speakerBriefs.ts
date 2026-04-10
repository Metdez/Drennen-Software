/**
 * @file lib/db/speakerBriefs.ts
 *
 * CRUD for speaker brief data — Gemini-generated pre-session briefing documents
 * that summarise student question themes, tensions, suggestions, blind spots,
 * and sentiment for the upcoming guest speaker.
 *
 * The table stores both the original AI-generated content (`content`) and any
 * professor edits (`edited_content`). Export functions prefer `edited_content`
 * when present.
 *
 * Table: speaker_briefs
 * Client: createAdminClient() — bypasses RLS throughout (briefs are written by
 *         background AI jobs and read in both authenticated and public portal contexts)
 *
 * Called by:
 *   - app/api/sessions/[id]/brief/route.ts           (GET — getSpeakerBrief, POST — insertSpeakerBrief)
 *   - app/api/sessions/[id]/brief/download/route.ts  (GET — getSpeakerBrief for export)
 *   - components/speaker/GenerateBriefButton.tsx      (via POST to /api/sessions/[id]/brief)
 *
 * Read by (portfolio context):
 *   - lib/db/portfolioShares.ts → getPortfolioSessionDetail  (reads speaker_briefs directly)
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { SpeakerBrief, SpeakerBriefContent, SpeakerBriefRow } from '@/types'

/**
 * Map a raw `speaker_briefs` database row to the camelCase domain type.
 */
/**
 * Maps a raw `speaker_briefs` database row object to the camelCase `SpeakerBrief` domain type.
 *
 * 1. What it does: Converts a database row, typically with snake_case column names, into a structured JavaScript object conforming to the `SpeakerBrief` type, using camelCase property names.
 * 2. Why it is used: To decouple the application's domain model from the underlying database schema and provide a consistent, type-safe data structure for application logic. It ensures that data retrieved from the database is immediately usable in the application without requiring further transformation at each call site.
 * 3. Important implementation details: Performs a direct one-to-one mapping of properties, renaming `session_id` to `sessionId`, `user_id` to `userId`, `edited_content` to `editedContent`, `created_at` to `createdAt`, and `updated_at` to `updatedAt`.
 */
function rowToBrief(row: SpeakerBriefRow): SpeakerBrief {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    content: row.content,
    editedContent: row.edited_content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Retrieve the speaker brief for a session, if one has been generated.
 *
 * @param sessionId - UUID of the session
 * @returns `SpeakerBrief` (including both `content` and optional `editedContent`), or `null`
 * @throws {Error} If the Supabase query fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/brief/route.ts (GET),
 *            app/api/sessions/[id]/brief/download/route.ts (GET)
 */
/**
 * Retrieves the speaker brief for a specified session from the database.
 *
 * 1. What it does: Fetches a single speaker brief entry from the `speaker_briefs` table using a session ID, including both the AI-generated content and any professor-made edits.
 * 2. Why it is used: To display or export the speaker brief content associated with a particular session within the application. It serves as the primary read operation for speaker briefs.
 * 3. Important implementation details:
 *     - Uses `createAdminClient()`: This bypasses Supabase Row Level Security (RLS), ensuring that the brief can be retrieved regardless of the authenticated user's permissions, which is necessary for server-side API operations.
 *     - Queries `speaker_briefs` table: Filters the results by `session_id` to retrieve the relevant brief.
 *     - Uses `maybeSingle()`: This method returns a single record if found or `null` if no record matches the query, simplifying null-checking.
 *     - Error Handling: Throws a standard JavaScript `Error` if the Supabase query itself fails, indicating a database or network issue.
 *     - Data Mapping: Utilizes the internal `rowToBrief` helper to transform the raw database row into the `SpeakerBrief` domain type.
 */
export async function getSpeakerBrief(sessionId: string): Promise<SpeakerBrief | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('speaker_briefs')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToBrief(data as SpeakerBriefRow) : null
}

/**
 * Insert or replace the AI-generated speaker brief for a session.
 *
 * Uses upsert on `session_id` so re-generating the brief (e.g. after editing
 * the system prompt) replaces the previous content rather than creating a
 * duplicate row.  `updated_at` is set explicitly to the current timestamp
 * because the DB default only fires on INSERT, not upsert-UPDATE.
 *
 * @param sessionId - UUID of the session
 * @param userId    - UUID of the owning professor
 * @param content   - Full `SpeakerBriefContent` payload from the Gemini agent
 * @returns The saved `SpeakerBrief` row
 * @throws {Error} If the upsert fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/brief/route.ts (POST)
 */
/**
 * Inserts a new AI-generated speaker brief into the database or updates an existing one for the same session.
 *
 * 1. What it does: Stores the initial content of a speaker brief generated by an AI agent. If a brief for the given session already exists, its content will be replaced (upserted).
 * 2. Why it is used: To persist the AI-generated speaker brief content for a session. The upsert functionality is crucial for scenarios where the brief might need to be re-generated (e.g., if the system prompt changes), ensuring that duplicate records are not created.
 * 3. Important implementation details:
 *     - Uses `createAdminClient()`: Bypasses Supabase RLS for server-side administrative write operations.
 *     - `upsert` operation: This method is used with `onConflict: 'session_id'`, meaning if a row with the same `session_id` already exists, it will be updated; otherwise, a new row will be inserted.
 *     - Manual `updated_at` setting: The `updated_at` timestamp is explicitly set to `new Date().toISOString()` because Supabase's default `updated_at` trigger typically fires only on `INSERT` operations, not on `UPDATE` operations performed via `upsert`.
 *     - Error Handling: Throws an `Error` if the Supabase upsert operation fails.
 *     - Returns `SpeakerBrief`: The newly created or updated brief is returned, mapped to the `SpeakerBrief` domain type via `rowToBrief`.
 */
export async function insertSpeakerBrief(
  sessionId: string,
  userId: string,
  content: SpeakerBriefContent
): Promise<SpeakerBrief> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('speaker_briefs')
    .upsert(
      // updated_at is set manually — DB default only fires on INSERT
      { session_id: sessionId, user_id: userId, content, updated_at: new Date().toISOString() },
      { onConflict: 'session_id' }
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToBrief(data as SpeakerBriefRow)
}

/**
 * Save professor edits to a speaker brief, or clear them by passing `null`.
 *
 * The `edited_content` column overlays the original AI content for display and
 * export without mutating the original.  Passing `null` reverts to the AI version.
 *
 * @param sessionId     - UUID of the session whose brief is being edited
 * @param editedContent - Updated `SpeakerBriefContent`, or `null` to clear edits
 * @throws {Error} If the update fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/brief/route.ts (PATCH / edit save)
 */
/**
 * Saves professor-made edits to a speaker brief or clears any existing edits.
 *
 * 1. What it does: Modifies the `edited_content` column of a specific speaker brief in the database. It allows a professor to save their refined version of the AI-generated content or to remove previously saved edits.
 * 2. Why it is used: To support the workflow where human oversight and modification are required for AI-generated content. By storing edits separately in `edited_content`, the original AI-generated `content` remains immutable, providing an audit trail or a fallback to the original version.
 * 3. Important implementation details:
 *     - Uses `createAdminClient()`: Bypasses Supabase RLS to allow server-side updates regardless of user permissions.
 *     - Updates `edited_content` column: Only this specific column is modified, identified by the `session_id`.
 *     - Clearing Edits: Passing `null` as `editedContent` will effectively remove the saved professor edits, causing the application to display the original `content` from the AI.
 *     - Manual `updated_at` setting: Similar to `insertSpeakerBrief`, the `updated_at` timestamp is explicitly set, as the database default only applies to `INSERT`.
 *     - Error Handling: Throws an `Error` if the Supabase update operation fails.
 */
export async function updateSpeakerBriefEdits(
  sessionId: string,
  editedContent: SpeakerBriefContent | null
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('speaker_briefs')
    .update({ edited_content: editedContent, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
}
