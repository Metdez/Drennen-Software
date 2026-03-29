import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { ComparativeAnalysis, SessionAnalysis, SessionTierData } from '@/types'

interface ComparisonInput {
  speakerA: string
  speakerB: string
  dateA: string
  dateB: string
  submissionCountA: number
  submissionCountB: number
  themesA: string[]
  themesB: string[]
  sharedThemes: Array<{ themeA: string; themeB: string }>
  uniqueThemesA: string[]
  uniqueThemesB: string[]
  sentimentA: SessionAnalysis['sentiment'] | null
  sentimentB: SessionAnalysis['sentiment'] | null
  tierDataA: SessionTierData | null
  tierDataB: SessionTierData | null
  participationOverlap: number
  participationOnlyA: number
  participationOnlyB: number
  totalStudents: number
}

function buildComparisonPrompt(input: ComparisonInput): string {
  const sentimentSection = (label: string, s: SessionAnalysis['sentiment'] | null) =>
    s
      ? `${label}: aspirational=${s.aspirational}%, curious=${s.curious}%, personal=${s.personal}%, critical=${s.critical}%`
      : `${label}: not available`

  const tierSection = (label: string, td: SessionTierData | null) => {
    if (!td) return `${label}: not available`
    const c = td.tierCounts
    return `${label}: Tier 1=${c['1'] ?? 0}, Tier 2=${c['2'] ?? 0}, Tier 3=${c['3'] ?? 0}, Tier 4=${c['4'] ?? 0}`
  }

  return `You are an expert at comparative analysis of university guest speaker sessions for a management class.

Compare these two sessions:

## Session A: ${input.speakerA}
- Date: ${input.dateA}
- Submissions: ${input.submissionCountA} students
- Themes: ${input.themesA.join(', ')}
- ${sentimentSection('Sentiment', input.sentimentA)}
- ${tierSection('Question Quality', input.tierDataA)}

## Session B: ${input.speakerB}
- Date: ${input.dateB}
- Submissions: ${input.submissionCountB} students
- Themes: ${input.themesB.join(', ')}
- ${sentimentSection('Sentiment', input.sentimentB)}
- ${tierSection('Question Quality', input.tierDataB)}

## Theme Overlap
Shared themes (appeared in both): ${input.sharedThemes.map(s => `"${s.themeA}" ↔ "${s.themeB}"`).join(', ') || 'none'}
Unique to ${input.speakerA}: ${input.uniqueThemesA.join(', ') || 'none'}
Unique to ${input.speakerB}: ${input.uniqueThemesB.join(', ') || 'none'}

## Participation
${input.participationOverlap} of ${input.totalStudents} students submitted for both sessions.
${input.participationOnlyA} students only submitted for ${input.speakerA}.
${input.participationOnlyB} students only submitted for ${input.speakerB}.

## Tier Quality Framework
- Tier 1 — Tension/Trade-off questions: Expose a real dilemma, difficult decision, or uncomfortable truth. These are gold.
- Tier 2 — Specific experience questions: Ask about a specific moment, turning point, failure, or decision.
- Tier 3 — Strategic insight questions: About how they think, frameworks, industry lessons.
- Tier 4 — Generic advice questions: "What advice would you give?" Generic questions.

Return a JSON object with EXACTLY this structure:
{
  "narrative": "string — 2-3 paragraphs synthesizing what this comparison reveals about pedagogical effectiveness. Go beyond restating numbers — provide genuine insight about what types of speakers, topics, or approaches generate stronger intellectual engagement.",
  "key_differences": [
    {
      "title": "string — short title for this difference",
      "description": "string — 1-2 sentences explaining the difference and its significance",
      "dimension": "themes" | "sentiment" | "participation" | "quality" | "engagement"
    }
  ],
  "sentiment_shift": {
    "summary": "string — one sentence summarizing how student sentiment differed between sessions",
    "notable_changes": [
      {
        "dimension": "string — sentiment category",
        "direction": "up" | "down" | "stable",
        "detail": "string — what this shift suggests"
      }
    ]
  },
  "recommendations": [
    {
      "text": "string — specific, actionable recommendation for future sessions",
      "reason": "string — grounded in the comparison data"
    }
  ]
}

Rules:
- key_differences: exactly 3-5 items. Surface patterns NOT visible from viewing sessions individually.
- recommendations: exactly 2-3 items. Must be specific and actionable.
- sentiment_shift.notable_changes: 2-4 items.
- The narrative must provide genuine insight, not just restate the numbers.
- Return ONLY valid JSON. No markdown fences, no explanation text.`
}

export async function runComparativeAnalysis(
  input: ComparisonInput
): Promise<ComparativeAnalysis> {
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildComparisonPrompt(input),
    config: {
      systemInstruction:
        'You are an expert educational data analyst specializing in comparative analysis. Always respond with valid JSON matching the requested schema exactly.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as ComparativeAnalysis
}
