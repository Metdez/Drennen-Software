/**
 * Error sanitization utility for API route catch blocks.
 *
 * Raw errors thrown by the Google Gemini SDK are serialized as JSON strings with a
 * nested `{"error":{"code":...,"message":...}}` envelope. If those strings reach the
 * client unprocessed, they expose internal API details and look broken in the UI.
 *
 * RULE: Every `catch` block in an API route that calls Gemini (or any AI provider)
 * MUST pass the caught error through `extractErrorMessage()` before sending it to the
 * client. Never return `err.message` or `String(err)` directly from an AI route.
 *
 * @example
 * // In an API route handler:
 * try {
 *   const result = await runSessionAnalysis(sessionId)
 *   return NextResponse.json(result)
 * } catch (err) {
 *   return NextResponse.json(
 *     { error: extractErrorMessage(err) },
 *     { status: 500 }
 *   )
 * }
 */

/**
 * Extracts a human-readable error message from an unknown caught value.
 *
 * Handles three cases in priority order:
 * 1. Gemini API errors — the SDK throws `Error` whose `message` is a JSON string with
 *    shape `{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"..."}}`.
 *    Rate-limit errors (429 / RESOURCE_EXHAUSTED) are mapped to a friendly user message.
 * 2. Plain `Error` instances — the `message` property is returned as-is.
 * 3. Anything else (strings, numbers, null) — coerced to string and returned.
 *
 * @param err - The unknown value caught in a `catch` block.
 * @param fallback - Message to return when `err` produces an empty string. Defaults to
 *   `"An unexpected error occurred."`.
 * @returns A sanitized, human-readable error string safe to send to the client.
 */
export function extractErrorMessage(err: unknown, fallback = 'An unexpected error occurred.'): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  if (!raw) return fallback

  try {
    // Attempt to parse as a Gemini-style JSON error envelope
    const parsed = JSON.parse(raw) as { error?: { code?: number; status?: string; message?: string } }
    if (parsed?.error?.message) {
      const { code, status } = parsed.error
      // Translate rate-limit errors into a friendly user-facing message
      if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
        return 'AI generation temporarily unavailable — spending limit reached. Please try again later.'
      }
      return parsed.error.message
    }
  } catch { /* not JSON — fall through to return raw string */ }

  return raw || fallback
}
