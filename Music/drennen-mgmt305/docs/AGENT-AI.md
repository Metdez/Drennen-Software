# AGENT-AI.md — Agent 08: AI Integration
# Wave 2 agent. Fires after Wave 1 is merged.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md (especially GOTCHA-008)
4. PROMPT.md ← this is your primary spec. Read every word.
5. ENV.md ← you need all three XAI_* vars
6. TYPES.md

---

## YOUR JOB

Build the xAI integration layer. You own these files and ONLY these files:

```
lib/ai/client.ts
lib/ai/prompt.ts
```

---

## CRITICAL SECURITY RULE

The XAI_API_KEY is accessed ONLY in `lib/ai/client.ts`. Never in any other file. Never in a component. Never in a page. If any other agent asks you where the API key is, point them here.

---

## FILE 1: lib/ai/client.ts

xAI uses the OpenAI-compatible API. We use the `openai` npm package pointed at the xAI base URL.

```ts
import OpenAI from 'openai'
import { buildSystemPrompt, buildUserMessage } from './prompt'

// This client is instantiated once. Server-side only.
const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1',
})

export interface GenerationResult {
  output: string
}

export async function generateQuestionSheet(
  speakerName: string,
  studentSubmissionsText: string
): Promise<GenerationResult> {
  const systemPrompt = buildSystemPrompt(speakerName)
  const userMessage = buildUserMessage(studentSubmissionsText)

  try {
    const completion = await xai.chat.completions.create({
      model: process.env.XAI_MODEL ?? 'grok-4-1-fast-reasoning',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4000,
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
```

---

## FILE 2: lib/ai/prompt.ts

Implements the system prompt from PROMPT.md exactly. Do not modify the prompt content — it is designed by the professor.

```ts
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

Produce exactly this structure — 10 numbered sections, each with this format:

---
**SECTION [N]: [THEME TITLE IN CAPS]**

**PRIMARY:** [The question, written exactly as the student submitted it or lightly cleaned up for grammar only]
*— [First Name Last Initial], [Tier description e.g. "Tension/Trade-off"]*

**BACKUP:** [The backup question]
*— [First Name Last Initial], [Tier description]*

[1-2 sentence moderator note: context about why this question is strong, or a suggested follow-up angle]

---

## RULES

- Do not combine or rewrite questions beyond light grammar cleanup. The student's voice should be preserved.
- Do not invent questions. Every question in the output must come from a student submission.
- If fewer than 2 student questions exist for a theme, note this in the moderator note and use the best available.
- The 10 themes should be distinct — do not repeat similar themes.
- Begin the output with a one-paragraph executive summary: speaker name, number of submissions reviewed, overall quality assessment, and any standout themes.
- End the output with a one-paragraph moderator note: suggested opening question, pacing notes, themes to spend extra time on.
- Attribution is mandatory. Never include a question without the student's name.

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

export function buildSystemPrompt(speakerName: string): string {
  return SYSTEM_PROMPT.replace(/\{\{SPEAKER_NAME\}\}/g, speakerName)
}

export function buildUserMessage(studentSubmissionsText: string): string {
  return `Here are all the student question submissions:\n\n${studentSubmissionsText}`
}
```

---

## COMPLETION CHECKLIST

- [ ] `lib/ai/client.ts` — xAI client, `generateQuestionSheet(speakerName, text)` exported
- [ ] `lib/ai/prompt.ts` — full system prompt, `buildSystemPrompt`, `buildUserMessage` exported
- [ ] API key only accessed via `process.env.XAI_API_KEY`, never hardcoded
- [ ] Error is caught and re-thrown with descriptive message
- [ ] Empty response case is handled
- [ ] `npx tsc --noEmit` passes with zero errors
