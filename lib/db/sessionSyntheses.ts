/**
 * @file lib/db/sessionSyntheses.ts
 *
 * CRUD for session synthesis data — an AI-generated meta-analysis that
 * combines multiple data dimensions (questions, debrief reflections, speaker
 * analyses, tier data, etc.) into a single unified narrative for a session.
 *
 * The `data_types` column records which input dimensions were available at the
 * time of generation (e.g. `["questions", "debrief", "speaker_analysis"]`),
 * allowing the UI to indicate what was included and trigger regeneration when
 * new data arrives.
 *
 * Table: session_syntheses
 *
 * Called by:
 *   - app/api/sessions/[id]/synthesis/route.ts  (GET, POST)
 *
 * Client summary:
 *   - Reads: createClient() — RLS enforced (professor reads only their own data)
 *   - Writes: createAdminClient() — bypasses RLS (synthesis is written by AI jobs)
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { SessionSynthesis } from '@/types'

/**
 * Retrieve the cached synthesis and the list of data types it was built from.
 * Returns `null` (without throwing) if no synthesis has been generated yet.
 *
 * @param sessionId - UUID of the session
 * @returns `{ synthesis, dataTypes }` or `null`
 *
 * Client: createClient() — RLS enforced
 * Called by: app/api/sessions/[id]/synthesis/route.ts (GET)
 */
/**
 * Retrieve the cached synthesis and the list of data types it was built from for a specific session.
 *
 * This function is used to fetch an existing AI-generated synthesis along with the identifiers of the data types (e.g., questions, debrief) that were fed into its creation. It allows the UI or other services to display the synthesis without needing to regenerate it.
 *
 * It queries the `session_syntheses` table, selecting the `synthesis` (JSONB) and `data_types` (JSONB array) columns. It uses `createClient()` for Supabase access, meaning Row Level Security (RLS) is enforced, ensuring only authorized users can retrieve the data. If no synthesis is found for the given `sessionId`, it returns `null` without throwing an error. The `data.synthesis` is explicitly cast to `SessionSynthesis` and `data.data_types` is coerced to `string[]` to correctly type the JSONB array returned by Supabase.
 */
export async function getSessionSynthesis(
  sessionId: string
): Promise<{ synthesis: SessionSynthesis; dataTypes: string[] } | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('session_syntheses')
    .select('synthesis, data_types')
    .eq('session_id', sessionId)
    .single()

  if (error) return null
  return {
    synthesis: data.synthesis as SessionSynthesis,
    // Coerce to string[] — JSONB arrays come back as `unknown` from Supabase
    dataTypes: (data.data_types as string[]) ?? [],
  }
}

/**
 * Insert or replace the AI-generated synthesis for a session.
 *
 * Uses upsert on `session_id` so regenerating the synthesis (e.g. after new
 * student data is uploaded) replaces the previous result without creating a
 * duplicate row.  `updated_at` is set explicitly because the DB default only
 * fires on INSERT, not on upsert-UPDATE.
 *
 * @param sessionId - UUID of the session
 * @param userId    - UUID of the owning professor (written for audit trail)
 * @param synthesis - Full `SessionSynthesis` payload from the AI agent
 * @param dataTypes - String tags identifying which input dimensions were used
 *                    (e.g. `["questions", "debrief", "tier_data"]`)
 * @throws {Error} If the upsert fails
 *
 * Client: createAdminClient() — bypasses RLS
 *         (synthesis is written by a background AI job with no auth context)
 * Called by: app/api/sessions/[id]/synthesis/route.ts (POST)
 */
/**
 * Insert or replace the AI-generated synthesis for a given session.
 *
 * This function is essential for storing and updating the output from AI agents after they process session data. It uses an 'upsert' operation to ensure that if a synthesis already exists for a session, it is updated rather than creating a duplicate entry. This is crucial for maintaining a single, current synthesis per session, especially when new data prompts a regeneration.
 *
 * It connects to Supabase using `createAdminClient()`, which bypasses Row Level Security (RLS). This is necessary because the synthesis is typically written by a background AI job that operates without a specific user's authentication context. The `onConflict: 'session_id'` clause ensures the upsert behavior. The `synthesis` payload is cast to `unknown as Record<string, unknown>` to comply with Supabase's type requirements for JSONB columns. Importantly, the `updated_at` timestamp is explicitly set to `new Date().toISOString()` because Supabase's default `updated_at` trigger only fires on `INSERT`, not on the `UPDATE` part of an upsert operation. The function throws an `Error` if the upsert operation fails.
 */
export async function upsertSessionSynthesis(
  sessionId: string,
  userId: string,
  synthesis: SessionSynthesis,
  dataTypes: string[]
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('session_syntheses')
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        // Cast to plain object — Supabase JSONB columns require `Record<string, unknown>`
        synthesis: synthesis as unknown as Record<string, unknown>,
        data_types: dataTypes,
        // Set manually: DB default only fires on INSERT, not upsert-UPDATE
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    )
  if (error) throw new Error(`Failed to upsert session synthesis: ${error.message}`)
}

/**
 * Retrieve only the `data_types` array for a session synthesis (lightweight check).
 *
 * Useful when the caller only needs to know which dimensions were included in
 * the last synthesis run (e.g. to show a "regenerate" banner when new data is
 * available) without fetching the full synthesis payload.
 *
 * @param sessionId - UUID of the session
 * @returns Array of data type strings, or `null` if no synthesis exists
 *
 * Client: createClient() — RLS enforced
 * Called by: app/api/sessions/[id]/synthesis/route.ts (GET — lightweight staleness check)
 */
/**
 * Retrieve only the `data_types` array for a session's synthesis, providing a lightweight check without fetching the full synthesis payload.
 *
 * This function is used when the caller only needs to determine which input dimensions (e.g., "questions", "debrief") were included in the most recent synthesis run for a session. It is particularly useful for scenarios like displaying a "regenerate" banner or status indicator when new data becomes available that wasn't part of the last synthesis. It avoids the overhead of fetching and processing the potentially large `synthesis` JSON object.
 *
 * It queries the `session_syntheses` table, specifically selecting only the `data_types` column. Like `getSessionSynthesis`, it uses `createClient()` for Supabase access, enforcing Row Level Security (RLS). If no synthesis is found for the given `sessionId`, it returns `null`. The `data.data_types` is coerced to `string[]` to correctly type the JSONB array returned by Supabase.
 */
export async function getSessionSynthesisDataTypes(
  sessionId: string
): Promise<string[] | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('session_syntheses')
    .select('data_types')
    .eq('session_id', sessionId)
    .single()

  if (error) return null
  return (data.data_types as string[]) ?? []
}
