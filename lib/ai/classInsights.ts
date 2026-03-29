import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import { fetchInsightsInput, upsertClassInsights } from '@/lib/db/classInsights'
import type { ClassInsights, ThemeEvolutionEntry } from '@/types'

function buildPrompt(input: Awaited<ReturnType<typeof fetchInsightsInput>>): string {
  const lastSession = input.sessions.at(-1)
  const sessionsWithDebriefs = input.sessions.filter(s => s.debriefRating !== null)
  const sessionsWithReflections = input.sessions.filter(s => s.studentReflectionThemes.length > 0)
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
    ...(s.studentReflectionThemes.length > 0 ? {
      studentReflectionThemes: s.studentReflectionThemes,
      studentReflectionSummary: s.studentReflectionSummary,
    } : {}),
  }))

  return `You are an expert curriculum analyst helping a university professor understand what their students most want to learn and discuss.

Your job is to identify the CORE THEMES across all student questions — the recurring topics, curiosities, and concerns that students keep coming back to. What are students hungry to hear about? What patterns reveal what this class actually cares about?

Session data (${input.sessions.length} session${input.sessions.length !== 1 ? 's' : ''}, oldest first):
${JSON.stringify(sessionSummary, null, 2)}
${sessionsWithDebriefs.length > 0 ? `
Post-session debrief data is available for ${sessionsWithDebriefs.length} session(s). Sessions with debriefRating, homeRunQuestions, and flatQuestions fields have professor feedback on which questions actually resonated in the room. Use this ground-truth data to assess which themes consistently produce the richest conversations vs. which fall flat.` : ''}
${sessionsWithReflections.length > 0 ? `
Student post-session reflections are available for ${sessionsWithReflections.length} session(s). Sessions with studentReflectionThemes and studentReflectionSummary fields contain AI-analyzed themes from student debrief submissions — what resonated, surprised students, and connected to their careers. Use this data to understand what ACTUALLY LANDED with students vs. what was intended. Compare pre-session question themes with post-session reflection themes to identify gaps between expectation and reality.` : ''}

Return a JSON object with exactly this structure:
{
  "narrative": "2-3 PARAGRAPHS (not sentences) synthesizing what students care about most. Name specific themes. Explain what the patterns reveal about student curiosity and intent. Note any shifts in sophistication or depth over time. Call out anything surprising. Write in a warm, insight-driven tone — this is an intelligence briefing for the professor, not a data dump. Separate paragraphs with double newlines.",
  "qualityTrend": {
    "direction": "improving" | "declining" | "stable",
    "description": "One sentence about how the depth or sophistication of student questions has evolved across sessions."
  },
  "topThemes": [
    {
      "title": "theme title",
      "sessionCount": number,
      "isNew": boolean,
      "summary": "2-3 sentences describing what students are asking about within this theme, how the angle has evolved across sessions, and what it reveals about student interests.",
      "sampleQuestions": ["representative question 1", "representative question 2", "representative question 3"]
    }
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
- narrative: 2-3 PARAGRAPHS answering "what do these students want to hear about?" — synthesize the dominant themes into a clear picture of student curiosity and intent; mention specific theme names; note evolution in sophistication; call out surprises
- qualityTrend.direction: infer from whether themes are becoming more strategic, personal, or sophisticated over sessions
- topThemes: all unique themes across all sessions, sorted by sessionCount descending; isNew=true only if theme first appeared in the most recent session; summary should describe what students ask about within this theme; sampleQuestions should be 2-3 representative questions students might ask about this theme (generate realistic examples based on the theme and speaker context)
- watchlist: only students absent from the last 2 sessions (if 2+ sessions exist); max 5 entries; empty array if none
- themeEvolution: one entry per session in chronological order, preserving the sessionId and date exactly as provided
- generatedAt: current ISO timestamp`
}

export async function generateClassInsights(userId: string, semesterId?: string): Promise<void> {
  const input = await fetchInsightsInput(userId, semesterId)
  if (input.sessions.length === 0) return

  const ai = getGeminiClient()

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
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

  // Build sessions list per theme from ground-truth data
  const sessionsByTheme = new Map<string, string[]>()
  for (const s of input.sessions) {
    for (const theme of s.themes) {
      const normalized = theme.toLowerCase()
      const list = sessionsByTheme.get(normalized) ?? []
      list.push(s.speakerName)
      sessionsByTheme.set(normalized, list)
    }
  }

  const analysis: ClassInsights = {
    narrative: parsed.narrative ?? '',
    qualityTrend: parsed.qualityTrend ?? { direction: 'stable', description: '' },
    topThemes: (parsed.topThemes ?? []).map(t => ({
      title: t.title,
      sessionCount: t.sessionCount,
      isNew: t.isNew ?? false,
      summary: t.summary ?? '',
      sessions: sessionsByTheme.get(t.title.toLowerCase()) ?? t.sessions ?? [],
      sampleQuestions: t.sampleQuestions ?? [],
    })),
    watchlist: parsed.watchlist ?? [],
    themeEvolution,
    ...(sessionEffectiveness.length > 0 ? { sessionEffectiveness } : {}),
    generatedAt: new Date().toISOString(),
  }

  await upsertClassInsights(userId, analysis, input.sessions.length, semesterId)
}
