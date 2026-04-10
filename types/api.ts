/**
 * @file types/api.ts
 * @description Shared API response envelope types and error helpers.
 *
 * These types are used by both API route handlers (to shape their JSON
 * responses) and by client-side fetch utilities (to narrow the result type).
 *
 * Pattern: every API call that can fail returns either a typed payload T or
 * an `ApiError`. Use `isApiError()` to discriminate before accessing data.
 *
 * Key routes these types cover:
 *   POST /api/process            → ProcessResponse
 *   GET  /api/sessions           → GetSessionsResponse
 *   GET  /api/sessions/[id]      → GetSessionResponse
 */

import type { Session, SessionSummary } from './session'

/**
 * Response shape for POST /api/process — the main ZIP upload and AI generation endpoint.
 * After the pipeline completes, the client caches `output` in sessionStorage
 * under the key `session_${sessionId}` to avoid a round-trip on the preview page.
 */
/**
 * What it does:
 * Defines the response structure for the `POST /api/process` endpoint.
 *
 * Why it is used:
 * This interface is crucial for the main AI generation workflow, providing the generated content, metrics, and relevant theme information back to the client after a user uploads a ZIP file.
 *
 * Important implementation details:
 * After the AI pipeline completes, the client is expected to cache the `output` string in `sessionStorage` under a key like `session_${sessionId}`. This pre-fills the preview page to avoid an additional network request.
 */
export interface ProcessResponse {
  sessionId: string
  /** The full AI-generated markdown output (10-section interview sheet). */
  output: string
  /** Number of student files successfully parsed from the ZIP. */
  fileCount: number
  /** Theme titles that appeared in a prior session — used to flag recurring topics on /preview. */
  overlappingThemes?: string[]
}

/**
 * Response shape for GET /api/sessions.
 * Returns lightweight summaries; the full `output` field is excluded for performance.
 */
/**
 * What it does:
 * Defines the response structure for the `GET /api/sessions` endpoint.
 *
 * Why it is used:
 * It's used to return a list of user sessions efficiently, typically for displaying a history or dashboard, without fetching the full, potentially large, generated output for each session.
 *
 * Important implementation details:
 * To optimize performance and reduce payload size, this response only includes `SessionSummary` objects, which are lightweight versions of sessions and do not contain the full AI-generated `output`.
 */
export interface GetSessionsResponse {
  sessions: SessionSummary[]
}

/**
 * Response shape for GET /api/sessions/[id].
 * Includes the full session object plus optional metadata about the prompt version
 * used during generation.
 */
/**
 * What it does:
 * Defines the response structure for the `GET /api/sessions/[id]` endpoint.
 *
 * Why it is used:
 * This interface is used when a client needs to retrieve the complete details of a specific session, including the full AI-generated markdown and any metadata about the prompt version used during its creation.
 *
 * Important implementation details:
 * It includes the full `Session` object. The optional `promptVersion` field provides traceability, indicating which custom prompt (if any) was active at the time of the session's generation. A `null` value for `promptVersion` implies the session used the system's default built-in prompt.
 */
export interface GetSessionResponse {
  session: Session
  /**
   * The custom prompt version that was active when this session was generated.
   * `null` if the session used the built-in default prompt (`prompt_version_id` IS NULL in DB).
   */
  promptVersion?: {
    id: string
    version: number
    label: string | null
  } | null
}

/**
 * Standard error envelope returned by all API routes on failure.
 * The `error` string is a human-readable message safe to display in the UI.
 * Use `extractErrorMessage()` from `lib/utils/errors.ts` in catch blocks to
 * sanitize raw AI/Gemini error JSON before placing it here.
 */
/**
 * What it does:
 * Defines a standard error object structure returned by all API routes when an operation fails.
 *
 * Why it is used:
 * It provides a consistent and predictable format for error responses across the entire API, simplifying error handling logic on the client-side.
 *
 * Important implementation details:
 * The `error` string is intended to be a human-readable message that is safe to display directly in the UI. It's recommended to use the `extractErrorMessage()` utility from `lib/utils/errors.ts` within `catch` blocks on the server to sanitize raw error messages (e.g., from AI APIs or database errors) before populating this field, preventing sensitive or overly technical details from leaking to the client.
 */
export interface ApiError {
  error: string
}

/**
 * Union type representing either a successful API response `T` or an `ApiError`.
 * Use with `isApiError()` to safely narrow to the success branch.
 *
 * @example
 * const result: ApiResult<GetSessionResponse> = await res.json()
 * if (isApiError(result)) { setError(result.error); return }
 * setSession(result.session)
 */
/**
 * What it does:
 * Defines a union type representing the potential outcome of an API call: either a successful response of type `T` or a standard `ApiError`.
 *
 * Why it is used:
 * This type provides strong type safety and improves developer experience when consuming API responses, making it explicit that any API call can either succeed with expected data or fail with a standardized error object. It works in conjunction with `isApiError()` for robust runtime type narrowing.
 *
 * Important implementation details:
 * It is designed to be used with the `isApiError()` type guard. After an API response is received and parsed (e.g., `await res.json()`), the `isApiError()` function can be used to safely narrow the type of the result to either the success type `T` or `ApiError`, allowing for clean conditional logic.
 */
export type ApiResult<T> = T | ApiError

/**
 * Type guard that narrows an unknown API response to `ApiError`.
 * Returns true when the object has an `error` string property.
 */
/**
 * What it does:
 * Provides a type guard function that determines if an unknown API response object is an `ApiError`.
 *
 * Why it is used:
 * This function is essential for safely handling and narrowing API responses typed as `ApiResult<T>`. It allows client-side code to differentiate between a successful data payload and an error payload at runtime, enabling type-safe access to the properties of either type.
 *
 * Important implementation details:
 * The function checks if the given object `res` is an object (not null) and if it contains a property named `error`. This simple check is sufficient given the `ApiError` interface's definition, which guarantees the presence of an `error` string.
 */
export function isApiError(res: unknown): res is ApiError {
  return typeof res === 'object' && res !== null && 'error' in res
}
