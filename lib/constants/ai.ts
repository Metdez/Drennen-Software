/**
 * Default configuration values for AI generation calls.
 *
 * These defaults are used by the xAI (Grok) session generation client and can be
 * referenced by other AI utilities that need a baseline. Override per-call only when
 * a specific agent genuinely needs different settings (e.g. a more deterministic
 * classifier might use `temperature: 0`).
 *
 * Do NOT import from this file directly. Import from the `@/lib/constants` barrel instead.
 */

/**
 * Shared AI generation defaults.
 *
 * - `MAX_TOKENS` — upper bound on generated output length (in tokens)
 * - `TEMPERATURE` — controls randomness; 0.3 favours consistency over creativity,
 *   which is appropriate for structured interview-sheet generation
 */
/**
 * Defines a set of core configuration parameters for interacting with an Artificial Intelligence (AI) model.
 *
 * Why it is used:
 * This constant centralizes and manages critical AI model settings, such as token limits and generation temperature. This ensures consistency across all AI interactions within the application and simplifies future adjustments to the AI model's behavior.
 *
 * Important implementation details:
 * - `MAX_TOKENS`: Specifies the maximum number of tokens the AI model is allowed to process or generate in a single request or response. This helps control costs and ensures responses fit within expected boundaries.
 * - `TEMPERATURE`: Controls the creativity and randomness of the AI's output. A lower value (like 0.3) makes the output more deterministic, focused, and less prone to unexpected variations, which is often desirable for tasks requiring accuracy and consistency.
 * - `as const`: The `as const` assertion ensures that this object and all its nested properties are deeply immutable (read-only). This provides strong type safety, preventing accidental modifications at runtime and improving code predictability.
 */
export const AI_CONFIG = {
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.3,
} as const
