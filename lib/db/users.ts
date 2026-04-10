/**
 * @file lib/db/users.ts
 *
 * Thin wrapper around Supabase Auth for resolving the currently authenticated
 * server-side user. This is the single entry point for "who is making this
 * request?" — all protected API routes call `getCurrentUser()` before touching
 * any other DB layer.
 *
 * Table(s): none (reads from `auth.users` via the Supabase Auth SDK, not a
 * public Postgres table).
 *
 * Client: createClient() — cookie-based session, RLS enforced.
 */

import { createClient } from '@/lib/supabase/server'
import type { AuthUser } from '@/types'

/**
 * Returns the currently authenticated user derived from the request cookie
 * session, or `null` if the user is unauthenticated or the session has expired.
 *
 * @returns A minimal `AuthUser` object (`id` + `email`), or `null` when no
 *   valid session exists.
 *
 * @example
 * ```ts
 * const user = await getCurrentUser()
 * if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * ```
 *
 * Called by: virtually every protected API route (app/api/**\/route.ts) as the
 * first auth check before any DB operation.
 *
 * Client: createClient() — RLS enforced (reads from auth context only).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // createClient() reads the session cookie set by the Supabase Auth helper.
  // getUser() validates the JWT server-side — never trust the client-supplied
  // user object directly.
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return {
    id: user.id,
    email: user.email ?? '',
  }
}
