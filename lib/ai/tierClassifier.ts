import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { TierData } from '@/types'
import { upsertTierData } from '@/lib/db/tierData'

const TIER_DEFINITIONS = `
Tier 1 — Tension/Trade-off questions: Questions that expose a real dilemma, difficult decision, or uncomfortable truth.
Tier 2 — Specific experience questions: Questions that ask about a specific moment, turning point, failure, or decision.
Tier 3 — Strategic insight questions: Questions about how they think, what frameworks they use, what they've learned.
Tier 4 — Generic advice questions: "What advice would you give?" or "What's your morning routine?" Generic questions.
`

function buildPrompt(speakerName: string, output: string): string {
  return `You are an expert at evaluating the quality of student interview questions for a guest speaker series.

Given the tier definitions below and a generated interview sheet for ${speakerName}, classify each question (both Primary and Backup) into Tier 1, 2, 3, or 4.

## Tier Definitions
${TIER_DEFINITIONS}

## Interview Sheet
${output}

Return a JSON object with this exact structure:
{
  "tierCounts": { "1": <count>, "2": <count>, "3": <count>, "4": <count> },
  "tierAssignments": [
    {
      "tier": <1|2|3|4>,
      "themeNumber": <section number 1-10>,
      "themeTitle": "<section title>",
      "questionType": "primary" | "backup",
      "studentName": "<student attribution>"
    }
  ]
}

Rules:
- Classify every Primary and Backup question (should be 20 total for a standard 10-section sheet)
- tierCounts should sum to the total number of questions classified
- Be strict: only Tier 1 if it truly exposes a tension or trade-off
- Tier 4 is for genuinely generic questions only`
}

/** Classify questions in a session's AI output into quality tiers */
export async function classifyQuestionTiers(
  speakerName: string,
  output: string
): Promise<TierData> {
  const ai = getGeminiClient()

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: buildPrompt(speakerName, output),
    config: {
      responseMimeType: 'application/json',
      systemInstruction:
        'You are an expert educational data analyst. Always respond with valid JSON matching the requested schema exactly.',
    },
  })

  const raw = (response.text ?? '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const parsed = JSON.parse(raw) as Partial<TierData>

  return {
    tierCounts: parsed.tierCounts ?? {},
    tierAssignments: parsed.tierAssignments ?? [],
  }
}

/** Fire-and-forget: classify tiers for a session and persist to DB */
export async function classifyAndStoreTiers(
  sessionId: string,
  speakerName: string,
  output: string
): Promise<void> {
  const tierData = await classifyQuestionTiers(speakerName, output)
  await upsertTierData(sessionId, tierData)
}
