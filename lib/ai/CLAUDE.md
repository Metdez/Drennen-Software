# lib/ai — AI Agent Layer

This folder contains every AI-powered agent, helper, and client that powers the guest speaker experience. The work here is split between two providers, with one narrowly dedicated to session generation and the other handling everything else.

## Architecture & Provider Responsibilities

| Provider | Client file | Scope | Why |
|----------|-------------|-------|-----|
| **xAI Grok** (OpenAI-compatible API) | `client.ts` | Session generation — turns a ZIP of student submissions into the 10-section interview sheet | xAI is only used for this deterministic transformation. The call goes through the OpenAI SDK with a `baseURL` override, so it can stay in the same `client.ts` helper without touching Gemini. |
| **Google Gemini** (`@google/genai`) | `geminiClient.ts` | All analysis, synthesis, report, recommendation, and SQL agents across the app | Gemini powers every other AI capability (analysis, profiles, insights, reports, SQL, speaker-facing materials). It is reused via the shared singleton so we never instantiate `GoogleGenAI` in each agent. |

### Clients in practice

- **xAI session generator** (`lib/ai/client.ts`): Lazy-create an OpenAI client that points at xAI’s endpoint. Consumed only by `generateQuestionSheet()`; no other file should import OpenAI directly for session generation.
- **Gemini client singleton** (`lib/ai/geminiClient.ts`): Exports `getGeminiClient()` and `getGeminiModel()`. Every Gemini-powered agent imports from here so that the API key check, instantiation, and model selection all live in one place. This singleton protects Next.js from crashing at build time (env vars are read lazily) and ensures we do not waste time reinitializing the SDK on every request.
- **Why the singleton matters**: `GoogleGenAI` requires a valid API key, and any module that runs during build (e.g., Next.js) can blow up if the key is missing. `geminiClient.ts` reads the key only when an agent first asks for the client, throws a user-friendly error if both `GEMINI_API_KEY` and `GOOGLE_API_KEY` are absent, and then reuses the same instance for all agents in the server process. This differs from the xAI client, which is also lazy but exists solely for the interview-sheet pipeline and uses the OpenAI SDK with a Grok-targeted `baseURL`. Never instantiate `GoogleGenAI` outside of `geminiClient.ts`.

## Agent Catalog

Every agent file in this folder starts with a header comment that explains what it does, when it is called, and which other modules it relies on. Below is the per-agent catalog grouped by calling pattern.

### Fire-and-forget / background work

- `classInsights.ts` — Synthesizes semester-wide class intelligence, called after `/api/process` or when professors complete a debrief. Reads from the DB, calls Gemini, and upserts `class_insights`.
- `studentProfile.ts` — Builds per-student growth intelligence profiles after uploads, reflections, or speaker analyses complete. Fetches cross-session data via the Supabase admin client, calls Gemini, and writes to `student_profiles`.
- `tierClassifier.ts` — Classifies every question of the session sheet into tiers via Gemini, then persists counts/assignments to `tier_data`.
- `generateSessionAnalysis.ts` — Thin wrapper that runs `analysisAgent.runSessionAnalysis` and persists the result. Invoked after session generation so the preview tab has cached analysis.
- `speakerRecommendations.ts` — Fire-and-forget helper callable from analytics routes that feeds the latest data into Gemini and merges the result into `class_insights.speakerRecommendations`.
- `speakerPortalPostSession.ts` (and `debriefReflectionAnalysis.ts` when invoked separately) — Generates the thank-you feedback section for the post-session speaker portal once the debrief completes.

### Synchronous / awaited results

- `client.ts` — xAI Grok interview-sheet generator (main `/api/process` pipeline).
- `analysisAgent.ts` — Session-, theme-, and cross-session analysis endpoints that run when professors open the preview/analytics pages; the calling routes await the JSON.
- `debriefSummary.ts` — Summarizes the professor’s debrief form right after the "Mark complete" action and returns a short narrative.
- `sqlAgent.ts` — Natural-language to SQL flow for the analytics page; the route awaits the result to show the answer and executed query.
- `reportAgent.ts` — Builds the semester report by orchestrating pure-data sections and multiple Gemini-powered narratives, then writes the final report row.
- `storyAgent.ts` — Creates the magazine-style semester story via a single Gemini call and saves it in the DB.
- `speakerBrief.ts` / `speakerPortal.ts` — Generate speaker-facing documents/portal content that are returned to the caller for persistence. These functions are synchronous because the caller immediately saves their outputs.
- `speakerAnalysisEvaluation.ts` / `debriefReflectionAnalysis.ts` — Produce structured JSON reflections or speaker-analysis summaries that are awaited by the API routes that store them.
- `comparisonAgent.ts` / `semesterComparison.ts` — Provide narrative comparisons between sessions or semesters when the analytics UI asks for them.
- `synthesisAgent.ts` — Cross-phase synthesis of the pre/post-session story; the consumer uses this for any view that needs to show the whole arc in one JSON payload.

### Support files

- `prompt.ts` — Contains the default Grok prompt plus helpers (`buildSystemPrompt`, `buildCustomSystemPrompt`, `validateCustomPrompt`, `buildUserMessage`). Used only by the xAI client.
- `geminiClient.ts` — Shared singleton; all Gemini agents depend on it.

## Adding or updating an agent

1. Create `lib/ai/yourAgent.ts` and begin with a header comment that explains what the agent produces, which routes or jobs call it, and what DB or helper modules it depends on.
2. Import `getGeminiClient()`/`getGeminiModel()` from `lib/ai/geminiClient.ts` (unless the agent is limited to xAI, in which case import from `lib/ai/client.ts`).
3. Add concise JSDoc to every exported function and any helper whose purpose is not immediately obvious.
4. If the agent is fire-and-forget, wrap the call in a route that ignores the promise (e.g., `void runXYZ()`), and document persistence expectations. If it is synchronous, document that its caller awaits the returned JSON.
5. Update this catalog with the new agent and any new entrypoint.
