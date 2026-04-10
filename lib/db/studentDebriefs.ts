/**
 * @file lib/db/studentDebriefs.ts
 *
 * Student debrief submission data — raw reflection text uploaded by students
 * after a guest speaker session, plus the AI analysis that synthesises those
 * reflections into aggregate insights.
 *
 * Tables touched:
 *   - student_debrief_submissions  (raw per-student text rows)
 *   - student_debrief_analyses     (AI-generated aggregate analysis)
 *
 * Called by:
 *   - app/api/sessions/[id]/student-debriefs/route.ts  (GET, POST)
 *
 * Flow:
 *  1. Professor uploads a ZIP of student reflection files
 *  2. `insertStudentDebriefSubmissions` bulk-inserts one row per student
 *  3. AI runs `lib/ai/debriefReflectionAnalysis.ts` → result saved via `upsertStudentDebriefAnalysis`
 *  4. `getStudentDebriefsBySession` + `getStudentDebriefAnalysis` serve the GET
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ParsedSubmission } from '@/lib/parse/builder'
import type { StudentDebriefAnalysis } from '@/types'

/**
 * Bulk-insert student debrief reflection submissions for a session.
 *
 * Each `ParsedSubmission` maps to one row.  The student name and filename are
 * preserved verbatim from the ZIP parser output.
 *
 * @param sessionId   - UUID of the session these submissions belong to
 * @param submissions - Array of parsed student submissions from `lib/parse/builder`
 * @returns void — no row data is needed by the caller
 * @throws {Error} If the batch insert fails
 *
 * Client: createAdminClient() — bypasses RLS
 *         (submissions are ingested by a background server-side job with no per-user auth context)
 * Called by: app/api/sessions/[id]/student-debriefs/route.ts (POST)
 */
/**
 * Bulk-insert student debrief reflection submissions for a session.
 *
 * What it does: This function takes an array of `ParsedSubmission` objects, which represent individual student debrief reflections, and inserts them as new rows into the `student_debrief_submissions` table in the database.
 * Why it is used: It is used to persist the raw text content and metadata of student debriefs that have been uploaded and parsed, making them available for retrieval and AI analysis.
 * Important implementation details:
 * - It leverages `createAdminClient()` to establish a Supabase client with administrative privileges, bypassing Row Level Security (RLS). This is crucial because submissions are ingested by a background server-side job that lacks specific per-user authentication context.
 * - Each `ParsedSubmission` object is mapped to a single database row, preserving the student name, filename, and submission text verbatim from the parser output.
 * - The function includes an early exit condition, skipping the database call entirely if the `submissions` array is empty, optimizing performance.
 * - It throws an `Error` if the batch insert operation fails, indicating a critical issue with data persistence.
 */
export async function insertStudentDebriefSubmissions(
  sessionId: string,
  submissions: ParsedSubmission[]
): Promise<void> {
  // Skip the DB call entirely if there is nothing to insert
  if (submissions.length === 0) return
  const supabase = createAdminClient()
  const rows = submissions.map((s) => ({
    session_id: sessionId,
    student_name: s.studentName,
    filename: s.filename,
    submission_text: s.text,
  }))
  const { error } = await supabase.from('student_debrief_submissions').insert(rows)
  if (error) throw new Error(`Failed to insert student debrief submissions: ${error.message}`)
}

/**
 * Delete all student debrief submission rows for a session.
 *
 * Used to clear a previous upload before inserting a fresh batch, keeping
 * the table in sync with whatever the professor last uploaded.
 *
 * @param sessionId - UUID of the session whose submissions should be deleted
 * @throws {Error} If the delete fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/student-debriefs/route.ts (POST — before re-insert)
 */
/**
 * Delete all student debrief submission rows for a session.
 *
 * What it does: This function removes all entries from the `student_debrief_submissions` table that are associated with a specific `sessionId`.
 * Why it is used: It is primarily used to clear out previous student debrief uploads for a session. This ensures that when a professor uploads a new batch of submissions, the database accurately reflects only the most recent set, preventing duplicate or stale data.
 * Important implementation details:
 * - It utilizes `createAdminClient()` to obtain an administrative Supabase client, allowing it to bypass Row Level Security (RLS). This is necessary as it performs a bulk delete operation that might otherwise be restricted by RLS rules.
 * - The deletion targets all rows where the `session_id` column matches the provided `sessionId`.
 * - The function throws an `Error` if the delete operation fails, signaling an issue with data integrity or database access.
 */
export async function deleteStudentDebriefSubmissions(sessionId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_debrief_submissions')
    .delete()
    .eq('session_id', sessionId)
  if (error) throw new Error(`Failed to delete student debrief submissions: ${error.message}`)
}

/**
 * Retrieve all raw debrief submission rows for a session, ordered by upload time.
 *
 * Returns a plain object array (not the domain type) because callers typically
 * pass this data directly to the AI analysis agent as raw text.
 *
 * @param sessionId - UUID of the session
 * @returns Array of `{ student_name, submission_text, filename }` objects, oldest first
 * @throws {Error} If the Supabase query fails
 *
 * Client: createClient() — RLS enforced (professor reads only their own sessions' data)
 * Called by: app/api/sessions/[id]/student-debriefs/route.ts (GET)
 */
/**
 * Retrieve all raw debrief submission rows for a session, ordered by upload time.
 *
 * What it does: This function fetches all the stored student debrief submission data—including student name, submission text, and filename—for a given session ID from the `student_debrief_submissions` table.
 * Why it is used: It is typically used to retrieve the raw student reflection data, which is then often passed directly to an AI analysis agent or displayed to the professor.
 * Important implementation details:
 * - It uses `createClient()` (rather than `createAdminClient()`), which means Row Level Security (RLS) is enforced. This ensures that a professor can only retrieve debrief data for sessions they own.
 * - The results are ordered by the `created_at` timestamp in ascending order, presenting the oldest submissions first.
 * - The function explicitly selects `student_name`, `submission_text`, and `filename`.
 * - It returns an array of plain JavaScript objects, not a specific domain type, as callers often consume this data as raw text. It also maps any potential `null` values from the database to empty strings to ensure data consistency.
 */
export async function getStudentDebriefsBySession(
  sessionId: string
): Promise<Array<{ student_name: string; submission_text: string; filename: string }>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('student_debrief_submissions')
    .select('student_name, submission_text, filename')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch student debrief submissions: ${error.message}`)
  return (data ?? []).map((row) => ({
    student_name: row.student_name ?? '',
    submission_text: row.submission_text ?? '',
    filename: row.filename ?? '',
  }))
}

/**
 * Check whether any debrief submissions exist for a session.
 *
 * Uses a `head: true` count query (no row data transferred) for efficiency.
 * Returns `false` silently on error rather than throwing, so callers can
 * use this as a lightweight gate without try/catch.
 *
 * @param sessionId - UUID of the session
 * @returns `true` if at least one submission row exists, `false` otherwise
 *
 * Client: createClient() — RLS enforced
 * Called by: app/api/sessions/[id]/student-debriefs/route.ts (GET — to decide whether to show upload prompt)
 */
/**
 * Check whether any debrief submissions exist for a session.
 *
 * What it does: This function efficiently determines if there is at least one student debrief submission associated with a specified session ID in the database.
 * Why it is used: It provides a quick and lightweight way to check for the presence of submissions without fetching any actual row data. This is useful for UI logic, such as deciding whether to display an upload prompt or to show existing debriefs.
 * Important implementation details:
 * - It uses `createClient()`, meaning Row Level Security (RLS) is enforced, allowing professors to check only their own sessions.
 * - The function employs a `select('id', { count: 'exact', head: true })` query. The `head: true` option is crucial as it instructs Supabase to only return the count of matching rows and not the actual row data, making the query highly efficient.
 * - It gracefully handles errors by returning `false` silently instead of throwing an exception. This allows callers to use it as a simple boolean gate without needing extensive `try/catch` blocks, providing a more resilient user experience.
 */
export async function hasStudentDebriefs(sessionId: string): Promise<boolean> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('student_debrief_submissions')
    .select('id', { count: 'exact', head: true }) // head:true = COUNT only, no rows returned
    .eq('session_id', sessionId)

  if (error) return false
  return (count ?? 0) > 0
}

/**
 * Insert or replace the AI-generated analysis of student debrief reflections.
 *
 * Uses upsert on `session_id` so re-running analysis after a new submission
 * upload replaces the previous result without creating a duplicate row.
 *
 * @param sessionId - UUID of the session
 * @param userId    - UUID of the owning professor (written for audit trail)
 * @param analysis  - Full `StudentDebriefAnalysis` payload from the AI agent
 * @param fileCount - Number of student files that were analysed (stored for display)
 * @throws {Error} If the upsert fails
 *
 * Client: createAdminClient() — bypasses RLS
 *         (analysis is written by a background AI job with no auth context)
 * Called by: app/api/sessions/[id]/student-debriefs/route.ts (POST — after AI run)
 */
/**
 * Insert or replace the AI-generated analysis of student debrief reflections.
 *
 * What it does: This function stores the output of the AI analysis for student debriefs, specifically for a given session. If an analysis for that session already exists, it updates it; otherwise, it inserts a new one.
 * Why it is used: It is used to cache the results of potentially expensive AI processing. This allows the application to retrieve and display the AI analysis without re-running the AI model every time, improving performance and reducing operational costs.
 * Important implementation details:
 * - It utilizes `createAdminClient()` to bypass Row Level Security (RLS). This is because the AI analysis is typically generated and written by a background server-side job that operates without a specific user's authentication context.
 * - The function performs an `upsert` operation (insert or update) based on the `session_id`. This is critical for ensuring that if analysis is re-run (e.g., after new submissions are uploaded), the previous result is replaced, preventing duplicate analysis entries.
 * - The `analysis` object, which is a JSONB type in the database, is cast to `unknown as Record<string, unknown>` to satisfy Supabase's type requirements for JSONB columns.
 * - It stores the `user_id` (owning professor) for audit purposes and `file_count` (number of files analyzed) for display in the UI.
 */
export async function upsertStudentDebriefAnalysis(
  sessionId: string,
  userId: string,
  analysis: StudentDebriefAnalysis,
  fileCount: number
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_debrief_analyses')
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        // Cast to plain object — Supabase JSONB columns require `Record<string, unknown>`
        analysis: analysis as unknown as Record<string, unknown>,
        file_count: fileCount,
      },
      { onConflict: 'session_id' }
    )
  if (error) throw new Error(`Failed to upsert student debrief analysis: ${error.message}`)
}

/**
 * Retrieve the cached AI analysis for student debrief reflections.
 * Returns `null` (without throwing) if no analysis exists yet.
 *
 * @param sessionId - UUID of the session
 * @returns `{ analysis, fileCount }` or `null`
 *
 * Client: createClient() — RLS enforced
 * Called by: app/api/sessions/[id]/student-debriefs/route.ts (GET)
 */
/**
 * Retrieve the cached AI analysis for student debrief reflections.
 * Returns `null` (without throwing) if no analysis exists yet.
 *
 * What it does: This function fetches the previously stored AI-generated analysis and the count of analyzed files for a specific session from the `student_debrief_analyses` table.
 * Why it is used: It provides a mechanism to quickly retrieve and display the AI-driven insights to the professor without needing to re-execute the AI analysis, leveraging the cached data.
 * Important implementation details:
 * - It uses `createClient()`, meaning Row Level Security (RLS) is enforced. This ensures that a professor can only retrieve analysis data for sessions they own.
 * - The query selects the `analysis` (a JSONB column containing the AI's output) and `file_count`.
 * - The `.single()` method is used because there should ideally be only one analysis record per `session_id`.
 * - If no analysis is found for the given `sessionId` or if an error occurs during the fetch, the function returns `null` silently. This allows for graceful handling in the UI, where the absence of analysis can be indicated without crashing the application.
 * - The retrieved `analysis` and `file_count` are cast back to their respective `StudentDebriefAnalysis` and `number` types for strong typing within the application.
 */
export async function getStudentDebriefAnalysis(
  sessionId: string
): Promise<{ analysis: StudentDebriefAnalysis; fileCount: number } | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('student_debrief_analyses')
    .select('analysis, file_count')
    .eq('session_id', sessionId)
    .single()

  if (error) return null
  return {
    analysis: data.analysis as StudentDebriefAnalysis,
    fileCount: data.file_count as number,
  }
}
