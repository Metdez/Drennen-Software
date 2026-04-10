/**
 * GET /api/system-prompts
 * POST /api/system-prompts
 *
 * Manages the professor's custom system prompt versions for the AI interview
 * sheet generator. Professors can author multiple saved versions and activate
 * one at a time; the active version is used for all subsequent session
 * generations. When no version is active, the built-in default prompt in
 * lib/ai/prompt.ts is used (promptVersionId = NULL on the sessions row).
 *
 * Auth: required for both methods
 *
 * GET — returns all saved prompt versions, the currently active version,
 *        and the built-in default prompt text (for display in the editor).
 *   Response (200): { versions: PromptVersion[], activeVersion: PromptVersion | null,
 *                     defaultPrompt: string }
 *
 * POST — creates a new immutable prompt version (does NOT activate it).
 *   Request body: { promptText: string; label?: string | null }
 *   Validation: validateCustomPrompt() enforces 50–10,000 char length.
 *   Response (200): { version: PromptVersion }
 *   Error responses:
 *     422 — validation failed or per-user version limit reached
 *     500 — unexpected error
 *
 * DB functions: getPromptVersions(), getActivePrompt(), createPromptVersion()
 */
import { NextResponse } from 'next/server'
import { DEFAULT_SYSTEM_PROMPT, validateCustomPrompt } from '@/lib/ai/prompt'
import { getCurrentUser } from '@/lib/db/users'
import { createPromptVersion, getActivePrompt, getPromptVersions } from '@/lib/db/systemPrompts'

/**
 * What it does: Specifies the rendering behavior for this Next.js API route.
 * Why it is used: Ensures that this API route is dynamically rendered on every request, preventing it from being statically generated or cached. This is critical for routes that handle user-specific data or frequently changing information.
 * Important implementation details: Setting 'force-dynamic' opts out of all caching and static optimization for this route segment, forcing a fresh response for each incoming request.
 */
export const dynamic = 'force-dynamic'

/**
 * Lists all saved prompt versions for the authenticated professor, plus the
 * currently active version and the built-in default prompt text.
 *
 * @returns 200 { versions, activeVersion, defaultPrompt }
 */
/**
 * What it does: Handles GET requests to retrieve all system prompt versions associated with the authenticated user (professor), the currently active prompt, and the default system prompt.
 * Why it is used: This endpoint provides the necessary data for the frontend to display and manage system prompts, allowing professors to view their saved versions, identify the one currently in use, and refer to the built-in default.
 * Important implementation details:
 * 1. It first authenticates the user using `getCurrentUser()` and returns a 401 Unauthorized if no user is found.
 * 2. It concurrently fetches saved prompt versions and the active prompt for the user using `Promise.all` for efficiency.
 * 3. The response includes an array of `versions`, the `activeVersion` object (or null if none), and the `DEFAULT_SYSTEM_PROMPT` text.
 * 4. Includes robust error handling, logging server-side errors and returning a 500 status for failures.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [versions, activeVersion] = await Promise.all([
      getPromptVersions(user.id),
      getActivePrompt(user.id),
    ])

    return NextResponse.json({
      versions,
      activeVersion,
      defaultPrompt: DEFAULT_SYSTEM_PROMPT,
    })
  } catch (err) {
    console.error('[/api/system-prompts GET]', err)
    return NextResponse.json({ error: 'Failed to fetch system prompts' }, { status: 500 })
  }
}

/**
 * Creates a new (inactive) prompt version for the authenticated professor.
 * The version must pass validation before it is saved. To make it active,
 * call PATCH /api/system-prompts/[id]/activate separately.
 *
 * @param request - JSON body with promptText and optional label
 * @returns 200 { version } on success; 422 on validation/limit error; 500 on failure
 */
/**
 * What it does: Handles POST requests to create a new (inactive) system prompt version for the authenticated user (professor).
 * Why it is used: This allows professors to save new custom system prompts to their account. These saved prompts can later be activated as the primary prompt through a separate API call.
 * Important implementation details:
 * 1. It authenticates the user using `getCurrentUser()` and returns a 401 Unauthorized if no user is found.
 * 2. It parses the `promptText` and an optional `label` from the request body.
 * 3. The `promptText` undergoes validation using `validateCustomPrompt` to ensure it meets length requirements (50-10,000 characters). Validation failures result in a 422 Unprocessable Content response.
 * 4. A new prompt version is created in the database via `createPromptVersion`, initially marked as inactive.
 * 5. It includes error handling to catch database issues and specifically handles a "limit reached" error from `createPromptVersion` by returning a 422 status, indicating a client-side constraint violation rather than a server error.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { promptText?: string; label?: string | null }
    const promptText = body.promptText?.trim() ?? ''
    const label = body.label?.trim() || null

    // Validate length (50–10,000 chars) and surface the first warning as the error message
    const validation = validateCustomPrompt(promptText)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.warnings[0] ?? 'Prompt must be between 50 and 10,000 characters.' },
        { status: 422 }
      )
    }

    const version = await createPromptVersion({
      userId: user.id,
      promptText,
      label,
    })

    return NextResponse.json({ version })
  } catch (err) {
    console.error('[/api/system-prompts POST]', err)
    const message = err instanceof Error ? err.message : 'Failed to create system prompt version'
    // createPromptVersion throws a descriptive error if the per-user version limit is hit;
    // surface that as 422 (client error) rather than 500 (server error)
    const status = message.includes('limit reached') ? 422 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
