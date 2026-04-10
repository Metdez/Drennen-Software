/**
 * @file lib/db/systemPrompts.ts
 *
 * Manages professor-authored custom system prompt versions stored in the
 * `custom_system_prompts` table. Professors can save multiple labeled versions
 * of the interview-sheet generation prompt, activate one at a time, or reset
 * back to the built-in default that lives in `lib/ai/prompt.ts`.
 *
 * Key invariants enforced by the DB (via RPC stored procedures):
 *   - Each professor has at most one active version (`is_active = true`).
 *   - Prompt versions are immutable rows (never updated in-place); activating
 *     a version sets `is_active = true` on the target and deactivates all
 *     others atomically inside `activate_custom_system_prompt_version`.
 *   - `sessions.prompt_version_id = NULL` means the built-in default was used.
 *
 * Table(s): `custom_system_prompts`
 *
 * Client:
 *   - Reads (getActivePrompt, getPromptVersions, getPromptById):
 *     createClient() — RLS enforced; professors only see their own versions.
 *   - Writes (createPromptVersion, activatePromptVersion, resetToDefault):
 *     createAdminClient() — needed because the RPCs modify rows across the
 *     table and require elevated privileges to deactivate the previous version.
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { CreateSystemPromptInput, SystemPrompt, SystemPromptRow } from '@/types'

/**
 * Maps a raw DB row (snake_case) to the `SystemPrompt` domain type (camelCase).
 * Private helper — not exported.
 */
/**
 * Maps a raw database row (snake_case) to the `SystemPrompt` domain type (camelCase).
 *
 * What it does: Converts a `SystemPromptRow` object, which typically comes directly from the database with snake_case field names, into a `SystemPrompt` object, which adheres to the application's camelCase naming conventions and domain model.
 * Why it is used: This function serves as a crucial abstraction layer, ensuring that the application logic consistently works with `SystemPrompt` objects, regardless of how the data is stored in the database. It prevents direct coupling to the database's schema details.
 * Important implementation details: It's a private helper function, explicitly not exported, indicating its internal utility within this module. It performs a direct, one-to-one mapping of fields.
 */
function rowToSystemPrompt(row: SystemPromptRow): SystemPrompt {
  return {
    id: row.id,
    userId: row.user_id,
    version: row.version,
    label: row.label,
    promptText: row.prompt_text,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

/**
 * Returns the professor's currently active custom system prompt, or `null` if
 * no custom prompt is active (meaning the built-in default from
 * `lib/ai/prompt.ts` should be used instead).
 *
 * Called at session generation time (`app/api/process`) to resolve which
 * prompt template to inject into the AI call.
 *
 * @param userId - The authenticated professor's user ID.
 * @returns The active `SystemPrompt`, or `null` if none is activated.
 * @throws Error if the query fails.
 *
 * Called by: app/api/process/route.ts, app/api/sessions/[id]/rerun/route.ts
 * Table: custom_system_prompts
 * Client: createClient() — RLS enforced
 */
/**
 * Returns the professor's currently active custom system prompt, or `null` if no custom prompt is active (meaning the built-in default from `lib/ai/prompt.ts` should be used instead).
 *
 * What it does: Queries the `custom_system_prompts` table to find the single prompt version marked as `is_active = true` for a specific user.
 * Why it is used: Called at session generation time (`app/api/process` and `app/api/sessions/[id]/rerun`) to resolve which prompt template (user-defined or built-in default) to inject into the AI call. This is central to customizing the AI's behavior based on user preferences.
 * Important implementation details: It uses `createClient()` to enforce Supabase Row Level Security (RLS), ensuring that users can only query their own prompts. The `maybeSingle()` method is employed to gracefully handle the scenario where no active custom prompt exists by returning `null`, which is a valid state. Any actual database query error will result in an `Error` being thrown.
 */
export async function getActivePrompt(userId: string): Promise<SystemPrompt | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_system_prompts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    // maybeSingle() returns null (not an error) when no row matches —
    // appropriate here because having no active custom prompt is valid
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch active system prompt: ${error.message}`)
  return data ? rowToSystemPrompt(data as SystemPromptRow) : null
}

/**
 * Returns all saved prompt versions for a professor, sorted by version number
 * descending (newest first). Used by the System Prompt Editor UI to render the
 * version history list.
 *
 * @param userId - The authenticated professor's user ID.
 * @returns Array of all `SystemPrompt` versions, newest first.
 * @throws Error if the query fails.
 *
 * Called by: app/api/system-prompts/route.ts (GET)
 * Table: custom_system_prompts
 * Client: createClient() — RLS enforced
 */
/**
 * Returns all saved prompt versions for a professor, sorted by version number descending (newest first). Used by the System Prompt Editor UI to render the version history list.
 *
 * What it does: Retrieves all custom system prompt entries associated with a given `userId` from the `custom_system_prompts` table.
 * Why it is used: This function populates the user interface of the System Prompt Editor, allowing professors to view their entire history of custom prompts, including inactive and older versions. It provides context and management capabilities for their prompt library.
 * Important implementation details: It uses `createClient()` for RLS enforcement. Results are ordered by the `version` field in descending order to present the newest prompts first. Each retrieved row is mapped to the `SystemPrompt` domain type using `rowToSystemPrompt` before being returned as an array.
 */
export async function getPromptVersions(userId: string): Promise<SystemPrompt[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_system_prompts')
    .select('*')
    .eq('user_id', userId)
    .order('version', { ascending: false })

  if (error) throw new Error(`Failed to fetch system prompt versions: ${error.message}`)
  return (data ?? []).map((row) => rowToSystemPrompt(row as SystemPromptRow))
}

/**
 * Fetches a single prompt version by its UUID.
 *
 * Used when activating a specific version by ID to confirm it exists and
 * belongs to the requesting professor before calling the activation RPC.
 *
 * @param id - The prompt version UUID.
 * @returns The `SystemPrompt`, or `null` if not found.
 * @throws Error if the query fails.
 *
 * Called by: app/api/system-prompts/[id]/activate/route.ts
 * Table: custom_system_prompts
 * Client: createClient() — RLS enforced
 */
/**
 * Fetches a single prompt version by its UUID.
 *
 * What it does: Queries the `custom_system_prompts` table to retrieve a specific prompt version using its unique `id`.
 * Why it is used: This function is primarily used to confirm that a prompt version with a given ID exists and belongs to the requesting professor before proceeding with operations like activation. It ensures data integrity and user authorization before critical updates.
 * Important implementation details: It uses `createClient()` for RLS enforcement. The `maybeSingle()` method ensures that if no prompt is found for the given ID (or if it doesn't belong to the requesting user due to RLS), `null` is returned without an error. Actual database query failures will throw an `Error`.
 */
export async function getPromptById(id: string): Promise<SystemPrompt | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_system_prompts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch system prompt version: ${error.message}`)
  return data ? rowToSystemPrompt(data as SystemPromptRow) : null
}

/**
 * Creates a new immutable prompt version row via a DB RPC that also
 * auto-increments the version number for the professor.
 *
 * The RPC `create_custom_system_prompt_version` handles auto-incrementing
 * the version counter atomically, avoiding race conditions if two requests
 * arrive simultaneously.
 *
 * @param input - Contains `userId`, `promptText`, and an optional `label`.
 * @returns The newly created `SystemPrompt` row.
 * @throws Error if the RPC fails (e.g. duplicate label constraint).
 *
 * Called by: app/api/system-prompts/route.ts (POST)
 * Table: custom_system_prompts
 * Client: createAdminClient() — bypasses RLS for atomic version-counter RPC
 */
/**
 * Creates a new immutable prompt version row via a DB RPC that also auto-increments the version number for the professor.
 *
 * What it does: Inserts a new custom system prompt version into the database, associating it with a user and automatically assigning the next sequential version number.
 * Why it is used: Allows users to save new or updated custom prompts, preserving all past versions. The use of a database RPC ensures atomicity and correctness for the version numbering, preventing race conditions that could occur if multiple updates were attempted simultaneously.
 * Important implementation details: This function utilizes `createAdminClient()` to bypass RLS, which is necessary for calling the `create_custom_system_prompt_version` RPC. This RPC handles the complex logic of atomic version incrementation. It takes the `userId`, `promptText`, and an optional `label` as parameters. A new `SystemPrompt` row is returned upon successful creation; any failure in the RPC will result in an `Error`.
 */
export async function createPromptVersion(input: CreateSystemPromptInput): Promise<SystemPrompt> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('create_custom_system_prompt_version', {
    p_user_id: input.userId,
    p_prompt_text: input.promptText,
    p_label: input.label ?? null,
  })

  if (error) throw new Error(`Failed to create system prompt version: ${error.message}`)
  return rowToSystemPrompt(data as SystemPromptRow)
}

/**
 * Activates a specific prompt version and deactivates all others for the
 * professor atomically via a DB RPC.
 *
 * The RPC `activate_custom_system_prompt_version` runs in a transaction:
 * it sets `is_active = false` on all rows for the user, then sets
 * `is_active = true` on the target row — ensuring exactly one active version
 * at all times.
 *
 * @param userId - The professor's user ID (ownership check inside the RPC).
 * @param promptId - UUID of the version to activate.
 * @returns void — throws if the RPC fails.
 *
 * Called by: app/api/system-prompts/[id]/activate/route.ts (PATCH)
 * Table: custom_system_prompts
 * Client: createAdminClient() — needed for cross-row atomic update
 */
/**
 * Activates a specific prompt version and deactivates all others for the professor atomically via a DB RPC.
 *
 * What it does: Changes the `is_active` status in the `custom_system_prompts` table for a given user, setting the specified `promptId` to active (`true`) and all other prompts for that user to inactive (`false`).
 * Why it is used: This function provides the core mechanism for users to switch their active custom system prompt. By using a database RPC within a transaction, it guarantees that exactly one custom prompt is active for a user at any given time, preventing inconsistent states.
 * Important implementation details: It requires `createAdminClient()` because the operation involves updating multiple rows for a user in a transactional manner (deactivating all, then activating one). The `activate_custom_system_prompt_version` RPC encapsulates this complex, atomic logic. The function returns `void` and throws an `Error` if the RPC fails.
 */
export async function activatePromptVersion(userId: string, promptId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('activate_custom_system_prompt_version', {
    p_user_id: userId,
    p_prompt_id: promptId,
  })

  if (error) throw new Error(`Failed to activate system prompt version: ${error.message}`)
}

/**
 * Resets all of a professor's custom prompt versions to inactive via a DB RPC,
 * effectively reverting to the built-in default prompt for future sessions.
 *
 * The RPC `reset_custom_system_prompts_to_default` sets `is_active = false`
 * on every row for the user. No rows are deleted — history is preserved.
 *
 * @param userId - The professor's user ID.
 * @returns void — throws if the RPC fails.
 *
 * Called by: app/api/system-prompts/reset/route.ts (POST)
 * Table: custom_system_prompts
 * Client: createAdminClient() — needed for bulk update across user's rows
 */
/**
 * Resets all of a professor's custom prompt versions to inactive via a DB RPC, effectively reverting to the built-in default prompt for future sessions.
 *
 * What it does: Sets the `is_active` status to `false` for all custom system prompt versions belonging to a specific user.
 * Why it is used: Provides a user-friendly way to revert to the application's default AI prompt behavior without permanently deleting any of their custom prompt history. This allows users to easily switch between custom and default settings.
 * Important implementation details: It uses `createAdminClient()` because the operation performs a bulk update across all of a user's prompt rows. The `reset_custom_system_prompts_to_default` RPC handles the transactional update, ensuring all relevant rows are modified. This function returns `void` and throws an `Error` if the RPC encounters issues.
 */
export async function resetToDefault(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('reset_custom_system_prompts_to_default', {
    p_user_id: userId,
  })

  if (error) throw new Error(`Failed to reset system prompt to default: ${error.message}`)
}
