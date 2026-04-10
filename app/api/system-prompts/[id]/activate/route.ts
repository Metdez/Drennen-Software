/**
 * PATCH /api/system-prompts/[id]/activate
 *
 * Activates a specific saved prompt version for the authenticated professor.
 * Only one version can be active at a time; activatePromptVersion() deactivates
 * any previously active version before setting the new one. Once active, this
 * version will be used as the system prompt for all subsequent session generations
 * until another version is activated or the prompt is reset to default.
 *
 * Auth: required
 *
 * Route params:
 *   - id (string) — UUID of the custom_system_prompts row to activate
 *
 * Security: the handler fetches the prompt by ID and verifies ownership
 *   (prompt.userId === user.id) before activating, preventing professors from
 *   activating another professor's prompt version.
 *
 * Response (200): { success: true }
 * Error responses:
 *   401 — not authenticated
 *   404 — prompt not found or belongs to another user
 *   500 — unexpected error
 *
 * DB functions: getPromptById(), activatePromptVersion()
 */
import { NextResponse } from 'next/server'
import { activatePromptVersion, getPromptById } from '@/lib/db/systemPrompts'
import { getCurrentUser } from '@/lib/db/users'

/**
 * What it does: Specifies the runtime behavior for this Next.js route segment.
 * Why it is used: It is set to 'force-dynamic' to ensure that this API route is not cached statically by Next.js. This is crucial for endpoints that modify database state or return user-specific data that must always be fresh.
 * Important implementation details: 'force-dynamic' ensures that the route handler is executed on every request, preventing any form of caching for this particular endpoint.
 */
export const dynamic = 'force-dynamic'

/**
 * Activates the specified prompt version, deactivating any other active version.
 *
 * @param _request - unused (no body required for activation)
 * @param params.id - UUID of the prompt version to activate
 * @returns 200 { success: true } on success
 */
/**
 * What it does: Handles HTTP PATCH requests to activate a specific version of a system prompt. When a prompt version is activated, any other currently active version for the same system prompt belonging to the user is automatically deactivated.
 * Why it is used: Provides an API endpoint for users to manage their system prompts, specifically to set a particular version as the currently active one for their applications or services.
 * Important implementation details:
 * 1. Authentication: It first authenticates the user using `getCurrentUser()`. If no user is found, it returns a 401 Unauthorized error.
 * 2. Authorization (Ownership Check): It fetches the prompt by the provided `id` and verifies that the prompt belongs to the authenticated user. This prevents one user from activating another user's prompt versions, returning a 404 Not Found if the prompt doesn't exist or doesn't belong to the user.
 * 3. Activation Logic: It calls `activatePromptVersion(user.id, params.id)` which handles the database logic of deactivating previous active versions and setting the specified `params.id` as the new active version for the given `userId`.
 * 4. Error Handling: Includes a try-catch block to gracefully handle potential errors during database operations or other processing, returning a 500 Internal Server Error if something goes wrong.
 * 5. Request Parameters: It expects the prompt version's UUID to be provided as part of the URL path (`params.id`). No request body is required for this operation.
 */
export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ownership check: fetch the prompt and verify it belongs to this user
    // before activating — prevents cross-user activation attacks
    const prompt = await getPromptById(params.id)
    if (!prompt || prompt.userId !== user.id) {
      return NextResponse.json({ error: 'Prompt version not found' }, { status: 404 })
    }

    // Deactivates any currently active version and sets this one as active
    await activatePromptVersion(user.id, params.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/system-prompts/[id]/activate PATCH]', err)
    return NextResponse.json({ error: 'Failed to activate system prompt version' }, { status: 500 })
  }
}
