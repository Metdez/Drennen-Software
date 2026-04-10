/**
 * @file lib/db/debriefs.ts
 *
 * Database access layer for post-session professor debriefs.
 *
 * Table: `session_debriefs`
 *   - One row per session (unique on `session_id`).
 *   - A debrief has two lifecycle states: `draft` (auto-saved while professor is editing)
 *     and `complete` (explicitly submitted, triggers AI summary generation).
 *   - The `ai_summary` column is populated by `lib/ai/debriefSummary.ts` (Gemini) when
 *     the professor marks the debrief complete via `completeDebrief()`.
 *
 * Mixed client usage:
 *   - `getDebrief()` uses `createClient()` (RLS enforced) — called in authenticated
 *     request context where the professor's cookie is present.
 *   - All write operations use `createAdminClient()` (bypasses RLS) — writes originate
 *     from API routes that have already authenticated the user and need to update records
 *     regardless of RLS INSERT/UPDATE policy granularity.
 *
 * Written by: app/api/sessions/[id]/debrief/ and app/api/sessions/[id]/debrief/complete
 * AI summary written by: lib/ai/debriefSummary.ts (Gemini, called from completeDebrief route)
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { SessionDebrief, SessionDebriefRow, UpsertDebriefInput, DebriefStatus } from '@/types'
import { rowToDebrief } from '@/lib/utils/transforms'

/**
 * Fetches the debrief for a session in an authenticated request context.
 *
 * Uses `createClient()` (RLS enforced) so professors can only read debriefs
 * belonging to their own sessions. Returns `null` on error rather than throwing,
 * because a missing or inaccessible debrief is a normal state (not yet created).
 *
 * @param sessionId - The UUID of the session whose debrief to fetch.
 * @returns The `SessionDebrief` domain object, or `null` if none exists or on error.
 *
 * Called by: app/api/sessions/[id]/debrief/route.ts (GET)
 * Table: session_debriefs
 * Client: createClient() — RLS enforced
 */
export async function getDebrief(sessionId: string): Promise<SessionDebrief | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('session_debriefs')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  // Silently return null rather than throwing — absence of a debrief is expected
  if (error) return null
  return data ? rowToDebrief(data as SessionDebriefRow) : null
}

/**
 * Creates or updates a debrief for a session, merging partial saves into a single row.
 *
 * Uses an upsert on `session_id` to support auto-save: the UI can call this repeatedly
 * with partial data and the latest values always win. All nullable fields default to
 * empty values rather than `undefined` to avoid leaving stale data from a previous save.
 *
 * @param input - Debrief fields from `UpsertDebriefInput`; all fields except `sessionId`
 *                and `userId` are optional and default to empty/null.
 * @returns The full saved `SessionDebrief` domain object.
 * @throws  If the upsert fails.
 *
 * Called by: app/api/sessions/[id]/debrief/route.ts (POST — auto-save and manual save)
 * Table: session_debriefs
 * Client: createAdminClient() — bypasses RLS
 */
export async function upsertDebrief(input: UpsertDebriefInput): Promise<SessionDebrief> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('session_debriefs')
    .upsert(
      {
        session_id: input.sessionId,
        user_id: input.userId,
        overall_rating: input.overallRating ?? null,
        questions_feedback: input.questionsFeedback ?? [],
        surprise_moments: input.surpriseMoments ?? '',
        speaker_feedback: input.speakerFeedback ?? '',
        student_observations: input.studentObservations ?? [],
        followup_topics: input.followupTopics ?? '',
        private_notes: input.privateNotes ?? '',
        // Default to 'draft'; caller passes 'complete' only via the separate completeDebrief()
        status: input.status ?? 'draft',
        updated_at: new Date().toISOString(),
      },
      // Conflict target matches the unique constraint on session_id
      { onConflict: 'session_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert debrief: ${error.message}`)
  return rowToDebrief(data as SessionDebriefRow)
}

/**
 * Marks a debrief as complete and stores the Gemini-generated AI summary.
 *
 * This is called after `lib/ai/debriefSummary.ts` has finished generating the summary.
 * Setting `status = 'complete'` is intentionally kept separate from `upsertDebrief()` to
 * prevent the auto-save loop from accidentally clearing the completed state.
 *
 * @param sessionId  - The UUID of the session whose debrief to complete.
 * @param aiSummary  - The AI-generated summary string produced by `debriefSummary.ts`.
 * @throws If the update fails (e.g., debrief row does not yet exist).
 *
 * Called by: app/api/sessions/[id]/debrief/complete/route.ts (POST)
 * Table: session_debriefs
 * Client: createAdminClient() — bypasses RLS
 * Written by AI: lib/ai/debriefSummary.ts (Gemini)
 */
export async function completeDebrief(sessionId: string, aiSummary: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('session_debriefs')
    .update({
      status: 'complete',
      ai_summary: aiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)

  if (error) throw new Error(`Failed to complete debrief: ${error.message}`)
}

/**
 * Shape returned by `getDebriefStatusesBySessionIds()` for each session.
 * Carries only the fields needed to render status badges on list views.
 */
export interface DebriefStatusInfo {
  status: DebriefStatus
  overallRating: number | null
}

/**
 * Batch-fetches debrief status and overall rating for a list of session IDs.
 *
 * Designed for efficiency on list pages (e.g., history, semester view) where rendering
 * a debrief status badge for each session would otherwise require N individual queries.
 * Returns a `Map` keyed by session ID for O(1) lookups when decorating the session list.
 *
 * Returns an empty `Map` on empty input or query error rather than throwing, so list
 * pages degrade gracefully if debrief data is unavailable.
 *
 * @param sessionIds - Array of session UUIDs to look up.
 * @returns A `Map<sessionId, DebriefStatusInfo>`. Sessions without a debrief row are
 *          absent from the map (not present with a null status).
 *
 * Called by: app/api/sessions/route.ts (GET) — decorates the session list
 * Table: session_debriefs
 * Client: createAdminClient() — bypasses RLS
 */
export async function getDebriefStatusesBySessionIds(
  sessionIds: string[]
): Promise<Map<string, DebriefStatusInfo>> {
  // Guard: avoid sending an IN() query with an empty array (Postgres error)
  if (sessionIds.length === 0) return new Map()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('session_debriefs')
    .select('session_id, status, overall_rating')
    .in('session_id', sessionIds)

  // Return empty map on error — callers treat missing entries as "no debrief"
  if (error || !data) return new Map()

  const map = new Map<string, DebriefStatusInfo>()
  for (const row of data) {
    map.set(row.session_id, {
      status: row.status as DebriefStatus,
      overallRating: row.overall_rating ?? null,
    })
  }
  return map
}

/**
 * Fetches all unique student names who submitted work for a given session.
 *
 * Used to populate autocomplete / suggestion lists in the debrief panel's
 * "student observations" field so professors can quickly tag student names
 * without typing them from memory.
 *
 * Deduplicates via `Set` because the same student name may appear across
 * multiple files in a single session ZIP.
 *
 * @param sessionId - The UUID of the session to look up submissions for.
 * @returns A sorted, deduplicated array of student name strings.
 *          Returns an empty array on error rather than throwing.
 *
 * Called by: app/api/sessions/[id]/debrief/route.ts (GET — student name suggestions)
 * Table: student_submissions
 * Client: createAdminClient() — bypasses RLS
 */
export async function getStudentNamesForSession(sessionId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_submissions')
    .select('student_name')
    .eq('session_id', sessionId)

  if (error || !data) return []
  // Deduplicate (a student may have submitted multiple files) then sort alphabetically
  return [...new Set(data.map((r: { student_name: string }) => r.student_name))].sort()
}
