/**
 * @file lib/ai/client.ts
 *
 * xAI (Grok) client for session generation — the primary AI workhorse of the app.
 *
 * This file owns the one place in the codebase that talks to xAI. It uses the
 * OpenAI SDK pointed at xAI's API endpoint via a `baseURL` override, because
 * xAI's API is OpenAI-compatible. The client is lazy-initialized so that
 * importing this module at build time (when env vars may be absent) does not
 * crash the Next.js build.
 *
 * **Responsibility boundary:** This file handles ONLY session generation
 * (turning student question ZIPs into the 10-section interview sheet). All
 * other AI features (analysis, profiles, reports, etc.) use Google Gemini via
 * `lib/ai/geminiClient.ts`.
 *
 * Called by: app/api/process/route.ts (main ZIP → AI pipeline)
 * Uses: lib/ai/prompt.ts (system prompt construction)
 */

import OpenAI from 'openai'
import { buildCustomSystemPrompt, buildSystemPrompt, buildUserMessage } from './prompt'

// Lazy initialization — avoids crash at build time when env vars are absent
/**
 * What it does: This variable holds a reference to the singleton instance of the OpenAI-compatible client.
 * Why it is used: It's used for lazy initialization of the AI client, preventing a crash at build time if environment variables for the AI service are not yet present. It also ensures that only a single instance of the client is created and reused across the application.
 * Important implementation details: It's initialized to `null` and only instantiated when `getClient()` is called for the first time, ensuring a lazy-loaded singleton pattern.
 */
let xai: OpenAI | null = null

/**
 * Returns the shared xAI OpenAI-compatible client, creating it on first call.
 *
 * The client is module-scoped and reused across requests (singleton pattern),
 * matching the same lazy-init approach used by `getGeminiClient()`.
 *
 * Env vars consumed:
 *   - XAI_API_KEY  — required; throws at runtime if missing
 *   - XAI_BASE_URL — optional; defaults to 'https://api.x.ai/v1'
 */
/**
 * What it does: This function returns the shared instance of the `OpenAI` client, which is configured to communicate with the xAI Grok API. If the client has not yet been initialized, it creates it on the first call.
 * Why it is used: It provides a centralized and lazy-initialized way to access the AI client. This prevents repeated instantiation, manages resource efficiently, and aligns with a singleton pattern for the AI service connection.
 * Important implementation details: It checks if `xai` is `null`. If so, it creates a new `OpenAI` instance using `process.env.XAI_API_KEY` (required) and `process.env.XAI_BASE_URL` (optional, defaults to 'https://api.x.ai/v1'). The client is module-scoped (`xai`) and reused across requests.
 */
function getClient(): OpenAI {
  if (!xai) {
    xai = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1',
    })
  }
  return xai
}

/** Shape returned by `generateQuestionSheet`. */
/**
 * What it does: This interface defines the expected shape of the object returned by the `generateQuestionSheet` function.
 * Why it is used: It provides type safety and clarity for the output of the AI generation process, making it easier for consuming code to understand and use the result.
 * Important implementation details: It currently contains a single property, `output`, which is a string representing the generated markdown content.
 */
export interface GenerationResult {
  output: string
}

/**
 * Calls xAI Grok to transform raw student question submissions into a
 * moderator-ready 10-section interview sheet.
 *
 * This is the core AI call of the entire application. It is invoked once per
 * ZIP upload after the parsing pipeline has assembled all student text into a
 * single structured string.
 *
 * The function resolves which system prompt to use:
 *   - If `customPromptText` is provided, it injects the speaker name into the
 *     professor's saved custom prompt template.
 *   - Otherwise it uses the built-in default prompt from `lib/ai/prompt.ts`.
 *
 * Temperature is intentionally low (0.3) to keep output deterministic and
 * consistently formatted across runs.
 *
 * Called by: app/api/process/route.ts
 * Uses: lib/ai/prompt.ts — buildSystemPrompt, buildCustomSystemPrompt, buildUserMessage
 *
 * @param speakerName           - Guest speaker's full name; injected into the system prompt
 * @param studentSubmissionsText - Concatenated text of all parsed student submissions
 * @param customPromptText       - Optional professor-saved custom prompt override
 * @returns                      - `{ output }` where `output` is the raw markdown interview sheet
 * @throws                       - Re-throws with a human-readable message on AI failure or empty response
 */
/**
 * What it does: This asynchronous function orchestrates the call to the xAI Grok model to transform raw student submissions into a structured, moderator-ready 10-section interview sheet. It selects the appropriate system prompt based on whether a custom prompt is provided.
 * Why it is used: This is the core AI logic of the application, responsible for taking aggregated student text and producing the primary output document. It abstracts away the direct interaction with the AI client and prompt construction.
 * Important implementation details: It prioritizes `customPromptText` over the built-in system prompt. The AI model used defaults to 'grok-4-1-fast-reasoning'. A low `temperature` (0.3) is set to ensure consistent and predictably formatted output. It handles potential AI failures or empty responses by re-throwing a human-readable error. It constructs messages for the AI with a 'system' role for the prompt and a 'user' role for the student submissions.
 */
export async function generateQuestionSheet(
  speakerName: string,
  studentSubmissionsText: string,
  customPromptText?: string
): Promise<GenerationResult> {
  // Select the active system prompt — custom takes precedence over the built-in default
  const systemPrompt = customPromptText
    ? buildCustomSystemPrompt(customPromptText, speakerName)
    : buildSystemPrompt(speakerName)
  const userMessage = buildUserMessage(studentSubmissionsText)

  try {
    const completion = await getClient().chat.completions.create({
      model: process.env.XAI_MODEL ?? 'grok-4-1-fast-reasoning',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4000,
      // Low temperature: we want consistent, structured output, not creative variation
      temperature: 0.3,
    })

    const output = completion.choices[0]?.message?.content
    if (!output) throw new Error('AI returned empty response')

    return { output }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown AI error'
    throw new Error(`AI generation failed: ${message}`)
  }
}
