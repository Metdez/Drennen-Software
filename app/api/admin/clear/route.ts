/**
 * POST /api/admin/clear
 *
 * Deletes ALL session rows owned by the currently authenticated user.
 * This is a destructive, development-facing utility endpoint — not exposed
 * in the production UI — used to wipe test data without touching other users.
 *
 * Auth: required (cookie-based Supabase session via getCurrentUser())
 *
 * Note: Uses createAdminClient() (service-role key, bypasses RLS) because the
 * sessions table has no DELETE RLS policy by design (sessions are normally
 * immutable). The user_id filter ensures a professor can only delete their own
 * sessions, not those of other users.
 *
 * Request body: none
 *
 * Response (200): { success: true }
 * Error responses:
 *   401 — not authenticated
 *   500 — Supabase delete failed
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * What it does: Configures the Next.js API route to be dynamically rendered.
 * Why it is used: Ensures that this API route is always executed on the server-side at request time and not cached statically. This is critical for an endpoint that performs a destructive action like clearing user sessions, as it prevents stale responses or incorrect behavior due to caching.
 * Important implementation details: The value 'force-dynamic' explicitly opts out of static rendering and caching for this route.
 */
export const dynamic = 'force-dynamic'

/**
 * Wipes all sessions for the authenticated user. Destructive — no undo.
 *
 * @returns 200 { success: true } on success
 */
/**
 * What it does: Handles POST requests to the `/api/admin/clear` endpoint, clearing all active sessions for the currently authenticated user from the database.
 * Why it is used: Provides an administrative utility for users to invalidate all their active login sessions across different devices or browsers. This can be used for security purposes (e.g., if a device is lost) or to ensure a complete logout from all active instances.
 * Important implementation details:
 * 1. It first authenticates the user using `getCurrentUser()`. If no user is found, it returns a 401 Unauthorized response.
 * 2. It creates an `admin` Supabase client using `createAdminClient()`. This is necessary because the `sessions` table typically lacks a `DELETE` RLS policy for regular users, preventing them from directly manipulating session records. The admin client bypasses RLS.
 * 3. The session deletion is explicitly scoped to `user.id`, ensuring that only the authenticated user's sessions are cleared, not all sessions in the system.
 * 4. Error handling is included; if the Supabase delete operation fails, a 500 Internal Server Error is returned with the error message.
 * 5. On successful deletion, it returns a 200 OK response with `{ success: true }`.
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service-role client is required because the sessions table intentionally
  // has no DELETE RLS policy (sessions are immutable in normal operation).
  // Scoped to the authenticated user's rows only — not a global wipe.
  const admin = createAdminClient()
  const { error } = await admin
    .from('sessions')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
