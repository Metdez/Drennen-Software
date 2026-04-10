/**
 * @file lib/ai/prompt.ts
 *
 * Built-in system prompt and prompt-construction helpers for xAI session generation.
 *
 * This file serves two distinct roles:
 *
 * 1. **Default prompt storage** — `SYSTEM_PROMPT` (exported as
 *    `DEFAULT_SYSTEM_PROMPT`) is the canonical interview-sheet prompt checked
 *    into version control. It instructs Grok to produce a 10-section
 *    moderator-ready interview sheet with tier-ranked questions.
 *
 * 2. **Runtime interpolation** — `buildSystemPrompt` and `buildCustomSystemPrompt`
 *    replace the `{{SPEAKER_NAME}}` placeholder at request time. Custom prompts
 *    are stored in the `custom_system_prompts` table and resolved by
 *    `lib/db/systemPrompts.ts`; this file only handles the string substitution.
 *
 * The separation of default prompt (here, in code) from custom prompts (in DB)
 * is intentional: the default stays version-controlled and consistent, while
 * professors can iterate on their own overrides without touching the codebase.
 * A `sessions.prompt_version_id = NULL` value signals that the built-in default
 * was used for that session.
 *
 * Called by: lib/ai/client.ts (generateQuestionSheet)
 * Also imported by: app/api/system-prompts/reset/route.ts (to restore default),
 *                   components/session/SystemPromptEditor.tsx (preview)
 */

/**
 * The built-in default system prompt for interview sheet generation.
 *
 * Contains a `{{SPEAKER_NAME}}` placeholder that must be replaced before
 * sending to the model — use `buildSystemPrompt()` rather than referencing
 * this constant directly in API calls.
 *
 * Prompt design notes:
 *   - Instructs the model to produce EXACTLY 10 thematic sections (no more, no less)
 *   - Defines a strict 4-tier quality ranking (Tension/Trade-off → Specific
 *     experience → Strategic insight → Generic advice) to guide question selection
 *   - Enforces precise markdown formatting so the Preview page parser and the
 *     PDF/DOCX exporters can reliably parse the output
 *   - Prohibits invented questions — every question must come from a student submission
 */
const SYSTEM_PROMPT = `You are an expert interview producer and moderator for a university guest speaker series.
Your job is to review student-submitted research questions for an upcoming interview with {{SPEAKER_NAME}} and produce a polished, moderator-ready interview sheet.

## YOUR TASK

Review every student question provided and produce exactly 10 thematic interview sections. Each section must include:
- One PRIMARY question (the best question on that theme)
- One BACKUP question (a strong alternative on the same theme)
- Attribution for each question: the student's first name and last initial (e.g., "Sarah M.")

## QUESTION QUALITY RANKING (apply this strictly)

Rank questions from highest to lowest quality when selecting primaries and backups:

1. **TIER 1 — Tension/Trade-off questions**: Questions that expose a real dilemma, difficult decision, or uncomfortable truth. "You've talked about growth at all costs — where did that mentality break things internally?" These are gold. Prioritize ruthlessly.

2. **TIER 2 — Specific experience questions**: Questions that ask about a specific moment, turning point, failure, or decision. "What was the hardest thing you had to do in the first 90 days?" Strong and usable.

3. **TIER 3 — Strategic insight questions**: Questions about how they think, what frameworks they use, what they've learned about their industry. "How do you think about building culture when you're scaling from 50 to 500?" Good questions.

4. **TIER 4 — Generic advice questions**: "What advice would you give to students?" or "What's your morning routine?" Use only as backups when nothing better exists on that theme. Flag these to the moderator.

## OUTPUT FORMAT

Begin with this header line exactly:
**Top Student Questions**

Then produce exactly 10 sections using this format for each:

***[N]. [Theme Title in Title Case]***
**Primary:** [The question, written exactly as the student submitted it or lightly cleaned up for grammar only] *([First Name Last Initial])*

**Backup:** [The backup question] *([First Name Last Initial])*

Rules for formatting:
- Section title: bold italic, numbered (e.g. ***1. Balancing Improv Openness with Leadership Discipline***)
- "Primary:" and "Backup:" labels: bold
- Question text: plain
- Student attribution: italic, in parentheses, immediately after the question (e.g. *(Victor C.)*)
- One blank line between the Primary line and the Backup line within a section
- One blank line between sections
- No separators, no moderator notes, no executive summary, no closing paragraph — nothing outside this structure

## RULES

- Do not combine or rewrite questions beyond light grammar cleanup. The student's voice should be preserved.
- Do not invent questions. Every question in the output must come from a student submission.
- If fewer than 2 student questions exist for a theme, use the best available.
- The 10 themes should be distinct — do not repeat similar themes.
- Attribution is mandatory. Never include a question without the student's name.
- Do not include tier labels, moderator notes, an executive summary, or any other text outside the 10 sections.

## SUGGESTED THEMES (adapt based on what the submissions actually cover)

1. Origin story and early career
2. A defining failure or setback
3. Leadership and building teams
4. Key strategic decisions
5. Industry trends and disruption
6. The hardest thing about the job no one talks about
7. What they know now that they wish they'd known earlier
8. Advice for people at the start of their career
9. What's next — vision and future bets
10. One thing they want this audience to walk away understanding`

export { SYSTEM_PROMPT as DEFAULT_SYSTEM_PROMPT }

/**
 * Interpolates the speaker's name into the built-in default system prompt.
 *
 * Called by `generateQuestionSheet` when no custom prompt override is active
 * for the professor.
 *
 * Called by: lib/ai/client.ts
 *
 * @param speakerName - Guest speaker's full name to substitute for `{{SPEAKER_NAME}}`
 * @returns            - Ready-to-send system prompt string
 */
export function buildSystemPrompt(speakerName: string): string {
  return SYSTEM_PROMPT.replace(/\{\{SPEAKER_NAME\}\}/g, speakerName)
}

/**
 * Interpolates the speaker's name into a professor-supplied custom prompt template.
 *
 * Custom prompts are stored in `custom_system_prompts` and retrieved via
 * `lib/db/systemPrompts.ts`. This function only handles the `{{SPEAKER_NAME}}`
 * substitution — the caller is responsible for fetching the right prompt text.
 *
 * Called by: lib/ai/client.ts
 *
 * @param customPromptText - Raw prompt template text from the DB
 * @param speakerName      - Guest speaker's full name
 * @returns                 - Ready-to-send system prompt string
 */
export function buildCustomSystemPrompt(customPromptText: string, speakerName: string): string {
  return customPromptText.replace(/\{\{SPEAKER_NAME\}\}/g, speakerName)
}

/**
 * Validates a professor-authored custom prompt before it is saved to the DB.
 *
 * Returns both a boolean `valid` flag and an array of human-readable `warnings`
 * so the UI can surface actionable feedback without blocking the save if the
 * professor wants to proceed anyway.
 *
 * Validation rules:
 *   - Must contain `{{SPEAKER_NAME}}` — otherwise the speaker name won't be injected
 *   - Must be at least 50 characters — guards against accidental near-empty saves
 *   - Must not exceed 10,000 characters — protects against excessively large prompts
 *
 * Called by: app/api/system-prompts/route.ts (POST handler),
 *            components/session/SystemPromptEditor.tsx (client-side preview)
 *
 * @param promptText - Raw prompt text as typed by the professor
 * @returns           - `{ valid, warnings }` where `valid` is true only when all
 *                      hard constraints pass (length bounds)
 */
export function validateCustomPrompt(promptText: string): { valid: boolean; warnings: string[] } {
  const trimmed = promptText.trim()
  const warnings: string[] = []

  if (!promptText.includes('{{SPEAKER_NAME}}')) {
    warnings.push("Missing {{SPEAKER_NAME}} placeholder - speaker name won't be inserted.")
  }
  if (trimmed.length < 50) {
    warnings.push('Prompt is very short - it may produce poor results.')
  }
  if (trimmed.length > 10000) {
    warnings.push('Prompt exceeds 10,000 characters.')
  }

  return {
    // `valid` is true when both hard length constraints pass; the SPEAKER_NAME
    // warning is advisory only and does not block saving
    valid: trimmed.length >= 50 && trimmed.length <= 10000,
    warnings,
  }
}

/**
 * Wraps the assembled student submissions text in the standard user-turn
 * message format expected by the Grok chat completion call.
 *
 * Keeping this as a named function (rather than an inline template literal in
 * `client.ts`) makes it easy to update the framing text in one place and keeps
 * the client file focused on SDK interaction logic.
 *
 * Called by: lib/ai/client.ts
 *
 * @param studentSubmissionsText - Pre-assembled text of all parsed student submissions
 * @returns                       - Formatted user message string
 */
export function buildUserMessage(studentSubmissionsText: string): string {
  return `Here are all the student question submissions:\n\n${studentSubmissionsText}`
}
