/**
 * @file lib/db/sessionAnalyses.ts
 *
 * Cached per-session Gemini analysis results.
 *
 * Table: session_analyses
 * Client: createAdminClient() — bypasses RLS (analysis is written by background AI jobs
 *         and read across public share contexts; user-scoped RLS would block both paths)
 *
 * Called by:
 *   - app/api/sessions/[id]/analysis/route.ts  (GET + POST)
 *
 * Read by:
 *   - app/api/shared/[token]/analysis/route.ts  (via getSessionAnalysisByShareToken in sessionShares.ts)
 *   - app/api/portfolio/[token]/sessions/[sessionId]/route.ts  (via getPortfolioSessionDetail in portfolioShares.ts)
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { SessionAnalysis } from '@/types'

/**
 * Retrieve the cached Gemini analysis for a session.
 *
 * @param sessionId - UUID of the session to look up
 * @returns The parsed `SessionAnalysis` object, or `null` if no row exists yet
 * @throws {Error} If the Supabase query itself fails (network / RLS errors)
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/analysis/route.ts (GET)
 */
/**
 * What it does:
 * Retrieves a cached AI-generated analysis (from Gemini) for a specific session from the `session_analyses` table in Supabase.
 *
 * Why it is used:
 * This function provides a mechanism to quickly retrieve previously computed analyses, avoiding the need to re-run expensive AI model calls. It's primarily used by API routes to serve session analysis data to the frontend.
 *
 * Important implementation details:
 * - Uses `createAdminClient()` to establish a Supabase client that bypasses Row Level Security (RLS). This ensures the function can always read the necessary data regardless of the authenticated user's permissions.
 * - Queries the `session_analyses` table, filtering by `session_id`.
 * - Employs `.maybeSingle()` to efficiently fetch either a single matching row or `null` if no record exists.
 * - The `analysis` field, stored as JSONB in the database, is cast to the `SessionAnalysis` TypeScript type.
 * - Throws an `Error` if the Supabase query itself encounters an issue (e.g., network error, internal database error).
 */
export async function getSessionAnalysis(sessionId: string): Promise<SessionAnalysis | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('session_analyses')
    .select('analysis')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? (data.analysis as SessionAnalysis) : null
}

/**
 * Persist a freshly generated Gemini analysis for a session.
 *
 * Uses an upsert with `ignoreDuplicates: true` so that concurrent background
 * jobs triggered by the same session upload do not overwrite each other — the
 * first writer wins and subsequent calls are silently ignored.
 *
 * @param sessionId - UUID of the session being analysed
 * @param userId    - UUID of the owning professor (written for audit trail / future RLS)
 * @param analysis  - Full `SessionAnalysis` payload from Gemini
 * @returns void — callers do not need the resulting row
 * @throws {Error} If the upsert fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/analysis/route.ts (POST), lib/ai/generateSessionAnalysis.ts
 */
/**
 * What it does:
 * Persists a freshly generated AI analysis (from Gemini) for a given session into the `session_analyses` table in Supabase.
 *
 * Why it is used:
 * This function is crucial for caching the results of expensive AI model computations. By storing the analysis, it prevents redundant AI processing for the same session and allows for quick retrieval later. It's called after an analysis has been successfully generated.
 *
 * Important implementation details:
 * - Uses `createAdminClient()` to obtain a Supabase client that bypasses Row Level Security (RLS), ensuring write operations can proceed without permission issues.
 * - Performs an `upsert` operation on the `session_analyses` table. An upsert is used to either insert a new record or update an existing one if a conflict occurs.
 * - Crucially, it's configured with `onConflict: 'session_id'` and `ignoreDuplicates: true`. This means if an entry for the `session_id` already exists, the new insert operation is silently ignored rather than causing an error or overwriting existing data. This pattern effectively handles potential race conditions where multiple concurrent background jobs might attempt to generate and insert the same analysis, ensuring that the first successful write wins.
 * - Stores the `session_id`, `user_id` (for audit trails and potential future RLS implementations), and the full `analysis` payload.
 * - Throws an `Error` if the upsert operation fails.
 */
export async function insertSessionAnalysis(
  sessionId: string,
  userId: string,
  analysis: SessionAnalysis
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('session_analyses')
    .upsert(
      { session_id: sessionId, user_id: userId, analysis },
      // ignoreDuplicates: true means a second concurrent insert is a no-op rather than an error
      { onConflict: 'session_id', ignoreDuplicates: true }
    )
  if (error) throw new Error(error.message)
}
