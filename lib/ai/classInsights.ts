import { GoogleGenAI } from '@google/genai'
import { fetchInsightsInput, upsertClassInsights } from '@/lib/db/classInsights'
import type { ClassInsights, ThemeEvolutionEntry } from '@/types'

function buildPrompt(input: Awaited<ReturnType<typeof fetchInsightsInput>>): string {
  const lastSession = input.sessions.at(-1)
  const sessionsWithDebriefs = input.sessions.filter(s => s.debriefRating !== null)
  const sessionSummary = input.sessions.map(s => ({
    speaker: s.speakerName,
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    submissions: s.submissionCount,
    themes: s.themes,
    ...(s.debriefRating !== null ? {
      debriefRating: s.debriefRating,
      homeRunQuestions: s.debriefHomeRunCount,
      flatQuestions: s.debriefFlatCount,
    } : {}),
  }))

  return `You are an expert curriculum analyst helping a university professor understand what their students most want to learn and discuss.

Your job is to identify the CORE THEMES across all student questions — the recurring topics, curiosities, and concerns that students keep coming back to. What are students hungry to hear about? What patterns reveal what this class actually cares about?

Session data (${input.sessions.length} session${input.sessions.length !== 1 ? 's' : ''}, oldest first):
${JSON.stringify(sessionSummary, null, 2)}
${sessionsWithDebriefs.length > 0 ? `
Post-session debrief data is available for ${sessionsWithDebriefs.length} session(s). Sessions with debriefRating, homeRunQuestions, and flatQuestions fields have professor feedback on which questions actually resonated in the room. Use this ground-truth data to assess which themes consistently produce the richest conversations vs. which fall flat.` : ''}

Return a JSON object with exactly this structure:
{
  "narrative": "2-3 sentence synthesis for the professor. Focus on: what core topics do students keep asking about? What does this reveal about what the class wants to learn? Be specific — name the actual themes.",
  "qualityTrend": {
    "direction": "improving" | "declining" | "stable",
    "description": "One sentence about how the depth or sophistication of student questions has evolved across sessions."
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
- narrative: answer "what do these students want to hear about?" — synthesize the dominant themes into a clear picture of student curiosity and intent; mention specific theme names
- qualityTrend.direction: infer from whether themes are becoming more strategic, personal, or sophisticated over sessions
- topThemes: all unique themes across all sessions, sorted by sessionCount descending; isNew=true only if theme first appeared in the most recent session
- watchlist: only students absent from the last 2 sessions (if 2+ sessions exist); max 5 entries; empty array if none
- themeEvolution: one entry per session in chronological order, preserving the sessionId and date exactly as provided
- generatedAt: current ISO timestamp`
}

export async function generateClassInsights(userId: string, semesterId?: string): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY env var is not set')

  const input = await fetchInsightsInput(userId, semesterId)
  if (input.sessions.length === 0) return

  const ai = new GoogleGenAI({ apiKey })
  const model = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview'

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

  // Build sessionEffectiveness from ground-truth debrief data
  const sessionEffectiveness = input.sessions
    .filter(s => s.debriefRating !== null)
    .map(s => ({
      speakerName: s.speakerName,
      rating: s.debriefRating!,
      homeRunCount: s.debriefHomeRunCount,
      flatCount: s.debriefFlatCount,
    }))

  const analysis: ClassInsights = {
    narrative: parsed.narrative ?? '',
    qualityTrend: parsed.qualityTrend ?? { direction: 'stable', description: '' },
    topThemes: parsed.topThemes ?? [],
    watchlist: parsed.watchlist ?? [],
    themeEvolution,
    ...(sessionEffectiveness.length > 0 ? { sessionEffectiveness } : {}),
    generatedAt: new Date().toISOString(),
  }

  await upsertClassInsights(userId, analysis, input.sessions.length, semesterId)
}
