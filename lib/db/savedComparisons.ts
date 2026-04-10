/**
 * @file lib/db/savedComparisons.ts
 *
 * Saved side-by-side session comparison shares.
 *
 * A `saved_comparisons` row stores the AI-generated comparative analysis for a
 * pair of sessions plus an optional public share token.  The table has a UNIQUE
 * constraint on `(user_id, session_id_a, session_id_b)` where the CHECK
 * constraint enforces `session_id_a < session_id_b` (lexicographic order).
 * All writes normalise the IDs through `normalizeIds()` before touching the DB.
 *
 * Table: saved_comparisons
 *
 * Called by:
 *   - app/api/compare/route.ts          (GET — getComparison)
 *   - app/api/compare/analysis/route.ts (POST — upsertComparison)
 *   - app/api/compare/share/route.ts    (POST — enableComparisonShare / revokeComparisonShare)
 *
 * Read by (public, no auth):
 *   - app/api/shared/compare/[token]/route.ts  (getComparisonByShareToken)
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { ComparativeAnalysis, SavedComparison, SavedComparisonRow } from '@/types'

/**
 * Map a raw `saved_comparisons` row to the camelCase domain type.
 */
/**
 * Map a raw `saved_comparisons` row to the camelCase domain type.
 *
 * What it does: Transforms a database row object (`SavedComparisonRow`) into a camelCase domain object (`SavedComparison`).
 * Why it is used: To convert raw data fetched from the database into a more convenient and type-safe format for application logic, aligning with JavaScript's camelCase naming convention.
 * Important implementation details: Performs a direct one-to-one mapping of fields, converting snake_case database column names (e.g., `user_id`) to camelCase property names (e.g., `userId`).
 */
function rowToComparison(row: SavedComparisonRow): SavedComparison {
  return {
    id: row.id,
    userId: row.user_id,
    sessionIdA: row.session_id_a,
    sessionIdB: row.session_id_b,
    aiComparison: row.ai_comparison,
    shareToken: row.share_token,
    createdAt: row.created_at,
  }
}

/**
 * Normalise a session ID pair so the smaller UUID is always `a`.
 *
 * The `saved_comparisons` table has a CHECK constraint requiring
 * `session_id_a < session_id_b`. This helper ensures all read and write
 * paths satisfy that constraint regardless of the order IDs are passed in.
 *
 * @param idA - First session UUID (any order)
 * @param idB - Second session UUID (any order)
 * @returns Tuple `[smaller, larger]`
 */
/**
 * Normalise a session ID pair so the smaller UUID is always `a`.
 *
 * The `saved_comparisons` table has a CHECK constraint requiring
 * `session_id_a < session_id_b`. This helper ensures all read and write
 * paths satisfy that constraint regardless of the order IDs are passed in.
 *
 * What it does: Takes two session UUIDs and returns them in a consistent, lexicographically sorted order.
 * Why it is used: To enforce a database CHECK constraint (`session_id_a < session_id_b`) in the `saved_comparisons` table, ensuring data consistency and simplifying queries by always storing and looking up session ID pairs in a canonical order.
 * Important implementation details: Compares the two UUID strings directly using the `<` operator, which performs a lexicographical comparison, and returns them as a tuple `[smaller, larger]`.
 */
function normalizeIds(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA]
}

/**
 * Look up an existing saved comparison for a pair of sessions.
 *
 * @param userId     - UUID of the authenticated professor
 * @param sessionIdA - UUID of one session (order does not matter — normalised internally)
 * @param sessionIdB - UUID of the other session
 * @returns `SavedComparison` if found, or `null`
 * @throws {Error} If the Supabase query fails
 *
 * Client: createClient() — RLS enforced (professor sees only their own comparisons)
 * Called by: app/api/compare/route.ts (GET)
 */
/**
 * Look up an existing saved comparison for a pair of sessions.
 *
 * @param userId     - UUID of the authenticated professor
 * @param sessionIdA - UUID of one session (order does not matter — normalised internally)
 * @param sessionIdB - UUID of the other session
 * @returns `SavedComparison` if found, or `null`
 * @throws {Error} If the Supabase query fails
 *
 * Client: createClient() — RLS enforced (professor sees only their own comparisons)
 * Called by: app/api/compare/route.ts (GET)
 *
 * What it does: Retrieves a specific saved comparative analysis record from the database based on the user's ID and a pair of session IDs.
 * Why it is used: To fetch a previously stored AI analysis result for display or further processing within the application, ensuring that users can only access their own comparisons.
 * Important implementation details:
 *   - Calls `normalizeIds` internally to ensure session IDs are queried in the correct, canonical order as per database constraints.
 *   - Uses `createClient()` which applies Row-Level Security (RLS), restricting results to comparisons owned by the authenticated `userId`.
 *   - Returns `null` if no matching comparison is found.
 *   - Throws a descriptive error if the Supabase query encounters a problem.
 */
export async function getComparison(
  userId: string,
  sessionIdA: string,
  sessionIdB: string
): Promise<SavedComparison | null> {
  const [a, b] = normalizeIds(sessionIdA, sessionIdB)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('saved_comparisons')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id_a', a)
    .eq('session_id_b', b)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch comparison: ${error.message}`)
  return data ? rowToComparison(data as SavedComparisonRow) : null
}

/**
 * Insert or update the AI comparative analysis for a session pair.
 *
 * Uses upsert on the `(user_id, session_id_a, session_id_b)` unique index so
 * re-running the comparison overwrites the previous result rather than
 * creating a duplicate row.
 *
 * @param userId     - UUID of the authenticated professor
 * @param sessionIdA - UUID of one session (order does not matter — normalised internally)
 * @param sessionIdB - UUID of the other session
 * @param analysis   - Full `ComparativeAnalysis` payload from the AI agent
 * @returns The saved `SavedComparison` including the auto-assigned `id`
 * @throws {Error} If the upsert fails
 *
 * Client: createAdminClient() — bypasses RLS (background AI results need write access)
 * Called by: app/api/compare/analysis/route.ts (POST)
 */
/**
 * Insert or update the AI comparative analysis for a session pair.
 *
 * Uses upsert on the `(user_id, session_id_a, session_id_b)` unique index so
 * re-running the comparison overwrites the previous result rather than
 * creating a duplicate row.
 *
 * @param userId     - UUID of the authenticated professor
 * @param sessionIdA - UUID of one session (order does not matter — normalised internally)
 * @param sessionIdB - UUID of the other session
 * @param analysis   - Full `ComparativeAnalysis` payload from the AI agent
 * @returns The saved `SavedComparison` including the auto-assigned `id`
 * @throws {Error} If the upsert fails
 *
 * Client: createAdminClient() — bypasses RLS (background AI results need write access)
 * Called by: app/api/compare/analysis/route.ts (POST)
 *
 * What it does: Creates a new saved comparison record or updates an existing one for a given user and a pair of session IDs with new AI analysis data.
 * Why it is used: To store the results of AI comparative analyses, ensuring that if a comparison is run multiple times for the same sessions, the existing record is updated instead of creating duplicate entries. This maintains data integrity and efficiency.
 * Important implementation details:
 *   - Utilizes `normalizeIds` to ensure session IDs are consistently ordered for the `upsert` operation.
 *   - Employs `createAdminClient()` to bypass Row-Level Security (RLS), which is often necessary for background processes or specific API routes that need unrestricted write access regardless of the user context.
 *   - The `upsert` method targets the unique composite index `(user_id, session_id_a, session_id_b)` to handle conflicts, overwriting existing data if a match is found.
 *   - Throws an error if the upsert operation fails.
 */
export async function upsertComparison(
  userId: string,
  sessionIdA: string,
  sessionIdB: string,
  analysis: ComparativeAnalysis
): Promise<SavedComparison> {
  const [a, b] = normalizeIds(sessionIdA, sessionIdB)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('saved_comparisons')
    .upsert(
      {
        user_id: userId,
        session_id_a: a,
        session_id_b: b,
        ai_comparison: analysis,
      },
      // Conflict target matches the table's unique constraint
      { onConflict: 'user_id,session_id_a,session_id_b' }
    )
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert comparison: ${error.message}`)
  return rowToComparison(data as SavedComparisonRow)
}

/**
 * Generate a fresh share token and attach it to an existing comparison row.
 *
 * Uses `crypto.randomUUID()` (Web Crypto — available in Node 19+ / Edge runtime)
 * rather than a DB-generated token so the token is available in JS before the
 * round-trip completes.
 *
 * @param comparisonId - UUID of the `saved_comparisons` row to share
 * @param userId       - UUID of the owning professor (prevents cross-user writes)
 * @returns The generated share token string
 * @throws {Error} If the update fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/compare/share/route.ts (POST)
 */
/**
 * Generate a fresh share token and attach it to an existing comparison row.
 *
 * Uses `crypto.randomUUID()` (Web Crypto — available in Node 19+ / Edge runtime)
 * rather than a DB-generated token so the token is available in JS before the
 * round-trip completes.
 *
 * @param comparisonId - UUID of the `saved_comparisons` row to share
 * @param userId       - UUID of the owning professor (prevents cross-user writes)
 * @returns The generated share token string
 * @throws {Error} If the update fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/compare/share/route.ts (POST)
 *
 * What it does: Assigns a newly generated, unique UUID as a share token to a specified saved comparison record, making it publicly shareable.
 * Why it is used: To provide a mechanism for users (professors) to share their AI comparison results with others via a public link, without requiring the viewers to authenticate.
 * Important implementation details:
 *   - Generates the share token using `crypto.randomUUID()` on the server side, which allows the token to be immediately available in the application before the database update completes.
 *   - Uses `createAdminClient()` to bypass RLS, enabling the update operation on the `share_token` column.
 *   - Includes a `userId` check in the update query (`.eq('user_id', userId)`) to ensure that only the owner of a comparison can enable sharing for it, preventing unauthorized modifications.
 *   - Throws an error if the database update fails.
 */
export async function enableComparisonShare(
  comparisonId: string,
  userId: string
): Promise<string> {
  const supabase = createAdminClient()
  const token = crypto.randomUUID()
  const { error } = await supabase
    .from('saved_comparisons')
    .update({ share_token: token })
    .eq('id', comparisonId)
    .eq('user_id', userId) // scoped to owner — prevents cross-user token injection

  if (error) throw new Error(`Failed to enable comparison sharing: ${error.message}`)
  return token
}

/**
 * Revoke public sharing by nulling out the share token.
 *
 * Setting `share_token` to `null` immediately invalidates any distributed URLs
 * without deleting the comparison data itself.
 *
 * @param comparisonId - UUID of the `saved_comparisons` row
 * @param userId       - UUID of the owning professor
 * @throws {Error} If the update fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/compare/share/route.ts (DELETE / disable)
 */
/**
 * Revoke public sharing by nulling out the share token.
 *
 * Setting `share_token` to `null` immediately invalidates any distributed URLs
 * without deleting the comparison data itself.
 *
 * @param comparisonId - UUID of the `saved_comparisons` row
 * @param userId       - UUID of the owning professor
 * @throws {Error} If the update fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/compare/share/route.ts (DELETE / disable)
 *
 * What it does: Removes the public share token from a specific saved comparison record by setting it to `null`.
 * Why it is used: To allow users to disable public sharing of their comparison results, immediately invalidating any previously generated share links without deleting the underlying comparison data.
 * Important implementation details:
 *   - Performs an update operation that sets the `share_token` column to `null` for the specified `comparisonId`.
 *   - Uses `createAdminClient()` to bypass RLS, necessary for performing the update operation.
 *   - Includes a `userId` check (`.eq('user_id', userId)`) to ensure that only the owner can revoke sharing for their comparison, safeguarding against unauthorized actions.
 *   - Throws an error if the database update fails.
 */
export async function revokeComparisonShare(
  comparisonId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('saved_comparisons')
    .update({ share_token: null })
    .eq('id', comparisonId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to revoke comparison sharing: ${error.message}`)
}

/**
 * Resolve a public share token to the full comparison record.
 * No authentication required — used by the public comparison viewer.
 *
 * @param token - UUID share token from the public URL
 * @returns `SavedComparison` if the token exists, or `null`
 * @throws {Error} If the Supabase query itself errors
 *
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Read by: app/api/shared/compare/[token]/route.ts
 */
/**
 * Resolve a public share token to the full comparison record.
 * No authentication required — used by the public comparison viewer.
 *
 * @param token - UUID share token from the public URL
 * @returns `SavedComparison` if the token exists, or `null`
 * @throws {Error} If the Supabase query itself errors
 *
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Read by: app/api/shared/compare/[token]/route.ts
 *
 * What it does: Retrieves a saved comparison record based on a given public share token.
 * Why it is used: To facilitate public viewing of shared comparison results without requiring user authentication, making the content accessible via a unique URL.
 * Important implementation details:
 *   - Uses `createAdminClient()` to bypass Row-Level Security (RLS) because this function is designed for public, unauthenticated access and therefore cannot rely on an authenticated user session.
 *   - Queries the `saved_comparisons` table specifically using the `share_token` field.
 *   - Returns `null` if no comparison is found that matches the provided token.
 *   - Throws an error if there is an issue during the Supabase query execution.
 */
export async function getComparisonByShareToken(
  token: string
): Promise<SavedComparison | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('saved_comparisons')
    .select('*')
    .eq('share_token', token)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch shared comparison: ${error.message}`)
  return data ? rowToComparison(data as SavedComparisonRow) : null
}
