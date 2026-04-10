/**
 * @file lib/ai/geminiClient.ts
 *
 * Lazy singleton factory for the Google Gemini AI client.
 *
 * **Every Gemini-powered feature in this codebase must import from this file.**
 * Do NOT instantiate `GoogleGenAI` directly anywhere else — doing so bypasses
 * centralized API key management and risks crashing the build when env vars are
 * absent (Next.js evaluates module-level code at build time).
 *
 * This pattern mirrors the xAI client in `lib/ai/client.ts`: the instance is
 * created on the first call and then reused for the lifetime of the server
 * process, avoiding repeated SDK initialization overhead.
 *
 * Consumers (all Gemini-powered agents):
 *   - lib/ai/analysisAgent.ts
 *   - lib/ai/classInsights.ts
 *   - lib/ai/studentProfile.ts
 *   - lib/ai/debriefSummary.ts
 *   - lib/ai/sqlAgent.ts
 *   - lib/ai/reportAgent.ts
 *   - lib/ai/storyAgent.ts
 *   - lib/ai/speakerBrief.ts
 *   - lib/ai/speakerPortal.ts
 *   - lib/ai/speakerPortalPostSession.ts
 *   - lib/ai/speakerRecommendations.ts
 *   - lib/ai/comparisonAgent.ts
 *   - lib/ai/semesterComparison.ts
 *   - lib/ai/synthesisAgent.ts
 *   - lib/ai/tierClassifier.ts
 *   - lib/ai/debriefReflectionAnalysis.ts
 *   - lib/ai/speakerAnalysisEvaluation.ts
 */

import { GoogleGenAI } from '@google/genai'

// Lazy singleton — matches the existing xAI pattern in client.ts
/**
 * What it does
 * Holds the singleton instance of the GoogleGenAI client after it has been initialized.
 *
 * Why it is used
 * This variable implements a lazy singleton pattern. It ensures that the GoogleGenAI client is created only once on the first request and reused for all subsequent calls, which conserves resources and avoids redundant initialization overhead.
 *
 * Important implementation details
 * It is initialized to `null` and its value is set by the `getGeminiClient` function, which performs the actual client instantiation. This allows for 'lazy' creation, meaning the client is only instantiated when it's actually needed.
 */
let gemini: GoogleGenAI | null = null

/**
 * Returns the shared GoogleGenAI client instance, creating it on the first call.
 *
 * Accepts either `GEMINI_API_KEY` or the legacy `GOOGLE_API_KEY` environment
 * variable so that projects using either naming convention work without changes.
 * Throws immediately if neither is set, giving a clear error rather than a
 * cryptic SDK failure downstream.
 *
 * Env vars consumed (in priority order):
 *   1. GEMINI_API_KEY
 *   2. GOOGLE_API_KEY (legacy alias)
 *
 * @throws {Error} If neither API key environment variable is set
 */
/**
 * What it does
 * Returns the singleton instance of the GoogleGenAI client, creating it on the first call if it hasn't been initialized yet.
 *
 * Why it is used
 * This function provides a centralized and consistent entry point for accessing the Google Gemini AI client throughout the application. It abstracts away the client's initialization logic, including API key resolution, and enforces the singleton pattern, ensuring efficient resource usage.
 *
 * Important implementation details
 * - It employs a lazy initialization strategy, creating the `GoogleGenAI` instance only when `getGeminiClient` is called for the first time.
 * - It prioritizes the `GEMINI_API_KEY` environment variable but falls back to `GOOGLE_API_KEY` for backward compatibility.
 * - It throws an `Error` immediately if neither required API key environment variable is found, providing clear and early feedback on misconfiguration rather than a cryptic SDK error later.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!gemini) {
    // Support both env var names; GEMINI_API_KEY takes precedence
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY or GOOGLE_API_KEY')
    gemini = new GoogleGenAI({ apiKey })
  }
  return gemini
}

/**
 * Returns the Gemini model identifier to use for all AI calls.
 *
 * Centralizing the model name here means a single env var change switches
 * every Gemini agent in the app simultaneously, without touching individual
 * agent files.
 *
 * Env var consumed:
 *   - GEMINI_MODEL — optional; defaults to 'gemini-3.1-flash-lite-preview'
 */
/**
 * What it does
 * Returns the string identifier for the Gemini AI model that should be used for AI interactions within the application.
 *
 * Why it is used
 * This function centralizes the configuration of the Gemini model name. By consolidating it here, all parts of the application that interact with Gemini AI can use a consistent model. This also allows for a single environment variable change (`GEMINI_MODEL`) to update the model used by every Gemini agent in the application simultaneously, without requiring modifications to individual agent files.
 *
 * Important implementation details
 * - It attempts to retrieve the model name from the `GEMINI_MODEL` environment variable.
 * - If the `GEMINI_MODEL` environment variable is not set, it defaults to `'gemini-3.1-flash-lite-preview'`, providing a sensible default out-of-the-box.
 */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview'
}
