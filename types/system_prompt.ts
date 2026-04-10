/**
 * @file types/system_prompt.ts
 * @description Custom system prompt version types.
 *
 * Professors can override the built-in interview-sheet generation prompt with
 * their own versioned prompts. Each saved version is immutable; activating a
 * version sets `is_active = true` on it and `false` on all others for that user.
 * When `sessions.prompt_version_id` is NULL, the built-in default prompt was used.
 *
 * Data is stored in the `custom_system_prompts` table and accessed through:
 *   GET   /api/system-prompts           → list all versions
 *   POST  /api/system-prompts           → create a new version
 *   PATCH /api/system-prompts/[id]/activate → activate a version
 *   POST  /api/system-prompts/reset     → revert to the built-in default
 *
 * Managed from the SystemPromptEditor component on the /dashboard page.
 *
 * Row vs Domain:
 *   SystemPromptRow — raw Supabase row shape (snake_case)
 *   SystemPrompt    — camelCase domain object used in the app
 */

/** Raw database row for the `custom_system_prompts` table. */
/**
 * What it does:
 * Represents the database schema for a custom system prompt entry.
 *
 * Why it is used:
 * This interface defines the exact structure and naming conventions (snake_case) for system prompt records as they are stored in the database. It ensures type safety and consistency when the backend interacts with the persistence layer.
 *
 * Important implementation details:
 * 1. `id`: A unique identifier for each system prompt record.
 * 2. `user_id`: Links the prompt to a specific user.
 * 3. `version`: An auto-incrementing integer specific to each user, starting at 1. It is assigned by the database upon insertion.
 * 4. `label`: An optional, human-readable name or description for the prompt version (e.g., "Finance focus Q4"). Can be null.
 * 5. `prompt_text`: The actual, full content of the system prompt to be used.
 * 6. `is_active`: A boolean flag indicating whether this specific prompt version is currently active for the associated user. Critically, at most one row per user can have `is_active = true`. If all rows for a user have `is_active = false`, a built-in default system prompt is used instead.
 * 7. `created_at`: A timestamp indicating when the prompt record was created.
 */
export interface SystemPromptRow {
  id: string
  user_id: string
  /**
   * Auto-incrementing version number per professor.
   * Assigned by the DB on insert; starts at 1 for each user.
   */
  version: number
  /** Optional human-readable label (e.g. "Finance focus Q4"). */
  label: string | null
  /** The full system prompt text used for session generation. */
  prompt_text: string
  /**
   * Whether this is the currently active custom prompt.
   * At most one row per user can have is_active = true.
   * When is_active = false for all rows, the built-in default prompt is used.
   */
  is_active: boolean
  created_at: string
}

/**
 * Domain-level custom system prompt version (camelCase).
 * Returned by GET /api/system-prompts and used in SystemPromptEditor.
 */
/**
 * What it does:
 * Represents a custom system prompt version in the application's domain layer, suitable for client-side consumption.
 *
 * Why it is used:
 * This interface serves as a Data Transfer Object (DTO) for conveying system prompt information between the backend API and the frontend client. It provides a clean, camelCase representation that is typically more convenient for frontend development, abstracting away the snake_case used at the database level. It is used for displaying prompt history and managing active prompts in the user interface.
 *
 * Important implementation details:
 * 1. `id`: Unique identifier for the prompt, directly mapping from `SystemPromptRow.id`.
 * 2. `userId`: The ID of the user who owns this prompt, mapping from `SystemPromptRow.user_id`.
 * 3. `version`: The auto-incrementing version number for display purposes (e.g., "v3") and for ordering in a version history list.
 * 4. `label`: An optional human-readable label for this prompt version.
 * 5. `promptText`: The full content of the system prompt.
 * 6. `isActive`: A boolean flag indicating if this is the user's currently active custom prompt. The active prompt is automatically used for all new session generation (e.g., via `POST /api/process`).
 * 7. `createdAt`: The timestamp when this prompt version was created.
 * This interface is typically returned by API endpoints like `GET /api/system-prompts` and consumed by UI components such as the `SystemPromptEditor`.
 */
export interface SystemPrompt {
  id: string
  userId: string
  /**
   * Auto-incrementing version number per professor.
   * Used for display (e.g. "v3") and ordering in the version history list.
   */
  version: number
  /** Optional human-readable label for this version. */
  label: string | null
  /** The full system prompt text. */
  promptText: string
  /**
   * Whether this version is currently active.
   * Active version is used for all new session generation via POST /api/process.
   */
  isActive: boolean
  createdAt: string
}

/**
 * Input shape for creating a new prompt version via `createPromptVersion()`.
 * Called from POST /api/system-prompts.
 * Version number is assigned by the DB, so it is not included here.
 */
/**
 * What it does:
 * Defines the expected input shape for creating a new custom system prompt version through an API call.
 *
 * Why it is used:
 * This interface specifies the minimum required payload for the `createPromptVersion()` function, which is typically invoked by the `POST /api/system-prompts` endpoint. It ensures that only necessary data fields are passed from the client to the server when a user wants to save a new system prompt configuration.
 *
 * Important implementation details:
 * 1. `userId`: The identifier of the user who is creating the new prompt version. This is a mandatory field.
 * 2. `promptText`: The complete text content of the system prompt that is to be saved as a new version. This is also a mandatory field.
 * 3. `label`: An optional human-readable label for this new prompt version. It can be provided as a string or `null`.
 * Notably, the `version` field is deliberately omitted from this input, as the version number is automatically assigned by the database upon successful insertion of the new prompt record, rather than being provided by the client.
 */
export interface CreateSystemPromptInput {
  userId: string
  /** The full system prompt text to save. */
  promptText: string
  /** Optional label for this version. */
  label?: string | null
}
