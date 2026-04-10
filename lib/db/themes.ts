/**
 * @file lib/db/themes.ts
 *
 * Database access layer for session theme frequency and title lookups.
 *
 * Tables touched (read-only):
 *   - `session_themes` — one row per theme per session (theme_number 1–10, theme_title)
 *   - `sessions`       — joined to filter by user_id and optional semester_id
 *
 * Mixed client usage:
 *   - `getThemeFrequency()` uses `createClient()` (RLS enforced) — called in authenticated
 *     request context; the inner-join on `sessions` implicitly scopes rows to the professor.
 *   - `getThemesBySessionId()` and `getRecentThemeTitles()` use `createAdminClient()` —
 *     used in background/fire-and-forget contexts (overlap detection, compare view) where
 *     no auth cookie is available.
 *
 * Called by:
 *   - app/api/analytics/themes/route.ts  (GET — getThemeFrequency)
 *   - app/api/sessions/[id]/route.ts     (GET — getThemesBySessionId, embedded in session detail)
 *   - lib/ai/classInsights.ts            (getRecentThemeTitles — overlap detection after session upload)
 *   - lib/db/portfolioShares.ts          (ThemeFrequency type only — portfolio analytics inlines similar logic)
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'

/** Defines the structure for aggregated theme frequency data. This interface is used to type the results returned by functions that calculate how often themes appear across a user's sessions. It includes the theme's title, its occurrence count, and the timestamp of its most recent appearance. */
export interface ThemeFrequency {
  themeTitle: string
  count: number
  lastSeen: string
}

/**
 * Returns theme frequency aggregated across all sessions for a user,
 * sorted by count descending (then by most-recent occurrence for stability).
 *
 * Performs an inner join on `sessions` (via the `!inner` Supabase hint) so only
 * theme rows belonging to the authenticated professor's sessions are returned.
 * When `semesterId` is provided, results are further scoped to that semester.
 *
 * Aggregation is done in the application layer (not via GROUP BY in SQL) because
 * the Supabase PostgREST API doesn't easily support grouped aggregates on join
 * columns. At typical professor scale (hundreds of sessions) this is performant.
 *
 * @param userId     - The authenticated professor's user ID.
 * @param semesterId - Optional semester UUID to narrow results to a single semester.
 * @returns Array of `ThemeFrequency` objects sorted by count descending, then by
 *          most-recent occurrence for tie-breaking.
 * @throws  If the Supabase query fails.
 *
 * Called by: app/api/analytics/themes/route.ts (GET)
 * Tables: session_themes (inner join sessions)
 * Client: createClient() — RLS enforced via inner join on sessions
 */
/**
 * Returns theme frequency aggregated across all sessions for a user, sorted by count descending (then by most-recent occurrence for stability).
 *
 * Performs an inner join on `sessions` (via the `!inner` Supabase hint) so only theme rows belonging to the authenticated professor's sessions are returned. When `semesterId` is provided, results are further scoped to that semester.
 *
 * Aggregation is done in the application layer (not via GROUP BY in SQL) because the Supabase PostgREST API doesn't easily support grouped aggregates on join columns. At typical professor scale (hundreds of sessions) this is performant.
 *
 * @param userId     - The authenticated professor's user ID.
 * @param semesterId - Optional semester UUID to narrow results to a single semester.
 * @returns Array of `ThemeFrequency` objects sorted by count descending, then by most-recent occurrence for tie-breaking.
 * @throws  If the Supabase query fails.
 *
 * Called by: app/api/analytics/themes/route.ts (GET)
 * Tables: session_themes (inner join sessions)
 * Client: createClient() — RLS enforced via inner join on sessions
 */
export async function getThemeFrequency(userId: string, semesterId?: string): Promise<ThemeFrequency[]> {
  const supabase = createClient()

  // Join through sessions to filter by user_id (session_themes has no user_id column)
  let query = supabase
    .from('session_themes')
    .select('theme_title, created_at, sessions!inner(user_id, semester_id)')
    .eq('sessions.user_id', userId)
  if (semesterId) query = query.eq('sessions.semester_id', semesterId)
  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch theme frequency: ${error.message}`)

  // Aggregate in application layer (avoids raw SQL / RPC while keeping it simple at this scale)
  const map = new Map<string, { count: number; lastSeen: string }>()
  for (const row of (data ?? [])) {
    const title = (row as any).theme_title as string
    const createdAt = (row as any).created_at as string
    const existing = map.get(title)
    if (!existing) {
      map.set(title, { count: 1, lastSeen: createdAt })
    } else {
      existing.count++
      if (createdAt > existing.lastSeen) existing.lastSeen = createdAt
    }
  }

  return Array.from(map.entries())
    .map(([themeTitle, { count, lastSeen }]) => ({ themeTitle, count, lastSeen }))
    .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
}

/**
 * Returns the ordered theme titles for a single session, ascending by theme_number.
 *
 * Theme numbers correspond to the 10 thematic sections in the AI-generated interview
 * sheet (e.g. theme 1 = most prominent). The order is preserved here so callers can
 * display themes in the same ranked order as the output document.
 *
 * @param sessionId - UUID of the session to look up.
 * @returns Array of theme title strings in ascending `theme_number` order.
 * @throws  If the Supabase query fails.
 *
 * Called by: app/api/sessions/[id]/route.ts (GET — embedded in session detail payload)
 * Table: session_themes
 * Client: createAdminClient() — bypasses RLS (session detail route validates ownership separately)
 */
/**
 * Returns the ordered theme titles for a single session, ascending by theme_number.
 *
 * Theme numbers correspond to the 10 thematic sections in the AI-generated interview sheet (e.g. theme 1 = most prominent). The order is preserved here so callers can display themes in the same ranked order as the output document.
 *
 * @param sessionId - UUID of the session to look up.
 * @returns Array of theme title strings in ascending `theme_number` order.
 * @throws  If the Supabase query fails.
 *
 * Called by: app/api/sessions/[id]/route.ts (GET — embedded in session detail payload)
 * Table: session_themes
 * Client: createAdminClient() — bypasses RLS (session detail route validates ownership separately)
 */
export async function getThemesBySessionId(sessionId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('session_themes')
    .select('theme_title')
    .eq('session_id', sessionId)
    .order('theme_number', { ascending: true })

  if (error) throw new Error(`Failed to fetch themes for session: ${error.message}`)
  return (data ?? []).map(t => (t as any).theme_title as string)
}

/**
 * Returns a flat list of theme titles from the N most-recent sessions for a user,
 * excluding the given session.
 *
 * Used immediately after a session is saved to detect thematic overlap between the
 * new session and the professor's recent history. The overlapping themes are cached
 * in `sessionStorage` on the `/preview` page under the key `overlap_${sessionId}`.
 *
 * Two-step query pattern:
 *   1. Fetch the IDs of the N most-recent sessions (excluding the current one).
 *   2. Fetch all `session_themes` rows for those session IDs.
 * This avoids a correlated subquery and keeps both queries simple.
 *
 * @param userId           - The professor's user ID.
 * @param excludeSessionId - The newly uploaded session's UUID (excluded to avoid
 *                           self-overlap false positives).
 * @param limit            - Max number of past sessions to scan (default 5).
 * @param semesterId       - Optional semester UUID to narrow the history window.
 * @returns Flat array of theme title strings (may contain duplicates across sessions).
 * @throws  If either Supabase query fails.
 *
 * Called by: lib/ai/classInsights.ts (overlap detection after session upload)
 *            app/api/sessions/[id]/route.ts (GET — overlap data for preview page)
 * Tables: sessions, session_themes
 * Client: createAdminClient() — bypasses RLS (called from background/fire-and-forget context)
 */
/**
 * Returns a flat list of theme titles from the N most-recent sessions for a user, excluding the given session.
 *
 * Used immediately after a session is saved to detect thematic overlap between the new session and the professor's recent history. The overlapping themes are cached in `sessionStorage` on the `/preview` page under the key `overlap_${sessionId}`.
 *
 * Two-step query pattern:
 *   1. Fetch the IDs of the N most-recent sessions (excluding the current one).
 *   2. Fetch all `session_themes` rows for those session IDs.
 * This avoids a correlated subquery and keeps both queries simple.
 *
 * @param userId           - The professor's user ID.
 * @param excludeSessionId - The newly uploaded session's UUID (excluded to avoid self-overlap false positives).
 * @param limit            - Max number of past sessions to scan (default 5).
 * @param semesterId       - Optional semester UUID to narrow the history window.
 * @returns Flat array of theme title strings (may contain duplicates across sessions).
 * @throws  If either Supabase query fails.
 *
 * Called by: lib/ai/classInsights.ts (overlap detection after session upload)
 *            app/api/sessions/[id]/route.ts (GET — overlap data for preview page)
 * Tables: sessions, session_themes
 * Client: createAdminClient() — bypasses RLS (called from background/fire-and-forget context)
 */
export async function getRecentThemeTitles(
  userId: string,
  excludeSessionId: string,
  limit = 5,
  semesterId?: string
): Promise<string[]> {
  const supabase = createAdminClient()

  // Fetch the N most-recent session IDs for this user (excluding current)
  let sessQuery = supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .neq('id', excludeSessionId)
  if (semesterId) sessQuery = sessQuery.eq('semester_id', semesterId)
  const { data: sessions, error: sessionsError } = await sessQuery
    .order('created_at', { ascending: false })
    .limit(limit)

  if (sessionsError) throw new Error(`Failed to fetch recent sessions: ${sessionsError.message}`)
  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map(s => s.id)

  const { data: themes, error: themesError } = await supabase
    .from('session_themes')
    .select('theme_title')
    .in('session_id', sessionIds)

  if (themesError) throw new Error(`Failed to fetch recent themes: ${themesError.message}`)

  return (themes ?? []).map(t => (t as any).theme_title as string)
}
