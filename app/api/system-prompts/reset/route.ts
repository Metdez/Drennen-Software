/**
 * POST /api/system-prompts/reset
 *
 * Reverts the professor's active prompt selection back to the built-in default.
 * Clears the active flag on all custom_system_prompts rows for this user.
 * After reset, session generation will use the hardcoded default prompt in
 * lib/ai/prompt.ts, and sessions.prompt_version_id will be NULL.
 *
 * Note: this does NOT delete saved prompt versions — they remain in the DB
 * and can be re-activated later via PATCH /api/system-prompts/[id]/activate.
 *
 * Auth: required
 * Request body: none
 *
 * Response (200): { success: true }
 * Error responses:
 *   401 — not authenticated
 *   500 — unexpected error
 *
 * DB functions: resetToDefault()
 */
import { NextResponse } from 'next/server'
import { resetToDefault } from '@/lib/db/systemPrompts'
import { getCurrentUser } from '@/lib/db/users'

/**
 * What it does: This variable configures the Next.js API route to be dynamically rendered.
 * Why it is used: It ensures that the route is not cached and is always executed on each request, which is crucial for sensitive operations like resetting user-specific data.
 * Important implementation details: Setting it to 'force-dynamic' explicitly opts the route out of static rendering or caching, forcing it to behave like a traditional server-side rendered endpoint. This is important for actions that modify data or require up-to-date user state, as it prevents stale data issues.
 */
export const dynamic = 'force-dynamic'

/**
 * Deactivates all custom prompt versions, restoring the built-in default.
 *
 * @returns 200 { success: true } on success
 */
/**
 * What it does: This asynchronous function handles POST requests to the /api/system-prompts/reset endpoint. Its primary purpose is to reset a user's custom system prompts to the default state by deactivating all custom versions.
 * Why it is used: It provides an API endpoint for users to revert any customizations they've made to their system prompts, effectively restoring the application's built-in default behavior. This is a common feature for managing user-configurable settings.
 * Important implementation details:
 * - It first authenticates the user using `getCurrentUser()`. If no user is found, it returns a 401 Unauthorized error, preventing unauthenticated access.
 * - It then calls `resetToDefault(user.id)` from `@/lib/db/systemPrompts` to update the database, setting `is_active = false` for all custom prompts associated with the authenticated user.
 * - On successful reset, it returns a 200 success response indicating the operation was completed.
 * - It includes comprehensive error handling using a try-catch block to gracefully manage any exceptions during the process, logging the error and returning a 500 Internal Server Error response to the client. The `console.error` helps in debugging server-side issues.
 * - The explicit `export async function POST()` makes it a Next.js API route handler for POST requests, adhering to the Next.js file-system based routing conventions.
 */
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Sets is_active = false on all custom_system_prompts rows for this user
    await resetToDefault(user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/system-prompts/reset POST]', err)
    return NextResponse.json({ error: 'Failed to reset system prompt' }, { status: 500 })
  }
}
