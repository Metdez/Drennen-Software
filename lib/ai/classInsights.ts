import { GoogleGenAI } from '@google/genai'
import { fetchInsightsInput, upsertClassInsights } from '@/lib/db/classInsights'
import type { ClassInsights, ThemeEvolutionEntry } from '@/types'

function buildPrompt(input: Awaited<ReturnType<typeof fetchInsightsInput>>): string {
  const lastSession = input.sessions.at(-1)
  const sessionSummary = input.sessions.map(s => ({
    speaker: s.speakerName,
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    submissions: s.submissionCount,
    themes: s.themes,
  }))

  return `You are a data analyst helping a university professor understand class engagement trends.

Session data (${input.sessions.length} session${input.sessions.length !== 1 ? 's' : ''}, oldest first):
${JSON.stringify(sessionSummary, null, 2)}

Top contributors (by sessions attended):
${input.leaderboard.slice(0, 5).map(l => `- ${l.studentName}: ${l.submissionCount} session(s)`).join('\n') || '- No data yet'}

Students absent from recent sessions:
${input.dropoff.length ? input.dropoff.map(d => `- ${d.studentName} (last seen: ${d.lastSeenSpeaker})`).join('\n') : '- None detected'}

Return a JSON object with exactly this structure:
{
  "narrative": "2-3 sentence plain-English summary for the professor. Be specific and insightful.",
  "qualityTrend": {
    "direction": "improving" | "declining" | "stable",
    "description": "One sentence about what drove this direction."
  },
  "topThemes": [
    { "title": "theme title", "sessionCount": number, "isNew": boolean }
  ],
  "watchlist": [
    { "studentName": "name", "reason": "specific reason" }
  ],
  "themeEvolution": [
    { "sessionId": "id", "speakerName": "name", "date": "ISO string", "themes": ["theme1", ...] }
  ],
  "generatedAt": "ISO timestamp"
}

Rules:
- narrative: professor-facing, actionable, mention specific speakers or themes by name
- qualityTrend.direction: infer from whether themes are becoming more strategic/sophisticated over sessions
- topThemes: all unique themes across all sessions, sorted by sessionCount descending; isNew=true only if theme first appeared in the most recent session
- watchlist: only students absent from the last 2 sessions (if 2+ sessions exist); max 5 entries; empty array if none
- themeEvolution: one entry per session in chronological order, preserving the sessionId and date exactly as provided
- generatedAt: current ISO timestamp`
}

export async function generateClassInsights(userId: string): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY env var is not set')

  const input = await fetchInsightsInput(userId)
  if (input.sessions.length === 0) return

  const ai = new GoogleGenAI({ apiKey })
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(input),
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

  const parsed = JSON.parse(raw) as Partial<ClassInsights>

  // Build themeEvolution from input (ground-truth session order) to avoid hallucination
  const themeEvolution: ThemeEvolutionEntry[] = input.sessions.map(s => ({
    sessionId: s.sessionId,
    speakerName: s.speakerName,
    date: s.date,
    themes: s.themes,
  }))

  const analysis: ClassInsights = {
    narrative: parsed.narrative ?? '',
    qualityTrend: parsed.qualityTrend ?? { direction: 'stable', description: '' },
    topThemes: parsed.topThemes ?? [],
    watchlist: parsed.watchlist ?? [],
    themeEvolution,
    generatedAt: new Date().toISOString(),
  }

  await upsertClassInsights(userId, analysis, input.sessions.length)
}
