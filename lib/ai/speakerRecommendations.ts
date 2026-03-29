import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import { fetchInsightsInput, getClassInsights, upsertClassInsights } from '@/lib/db/classInsights'
import type { ClassInsights, SpeakerRecommendations, SpeakerPatternAnalysis } from '@/types'
import type { InsightsInput } from '@/lib/db/classInsights'

function buildPrompt(input: InsightsInput): string {
  const sessionCount = input.sessions.length
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
      followupTopics: s.debriefFollowups || undefined,
    } : {}),
    ...(s.studentReflectionThemes.length > 0 ? {
      studentReflectionThemes: s.studentReflectionThemes,
      studentReflectionSummary: s.studentReflectionSummary,
    } : {}),
  }))

  const confidenceLevel = sessionCount < 3 ? 'low' : sessionCount < 7 ? 'moderate' : 'high'

  return `You are a thoughtful academic advisor helping a university professor plan their guest speaker lineup for a business management course.

Your job is to analyze all available session data — themes students asked about, debrief feedback on what worked, student reflections on what resonated — and recommend what the NEXT speaker should cover and what kind of speaker would be most effective.

Session data (${sessionCount} session${sessionCount !== 1 ? 's' : ''}, oldest first):
${JSON.stringify(sessionSummary, null, 2)}
${sessionsWithDebriefs.length > 0 ? `
${sessionsWithDebriefs.length} session(s) have post-session debrief data with ratings (1-5), home-run question counts, flat question counts, speaker feedback, surprise moments, and follow-up topics. Use this ground-truth data to assess which speakers and topics resonated most.` : ''}

Data confidence level: ${confidenceLevel} (${sessionCount} session${sessionCount !== 1 ? 's' : ''})

Return a JSON object with exactly this structure:
{
  "recommendations": [
    {
      "topicArea": "The specific topic area to cover next",
      "whyRecommended": "2-3 sentences explaining why this topic is recommended, citing specific data points (theme gaps, student interests, debrief feedback)",
      "studentInterestSignals": ["signal 1", "signal 2", "signal 3"],
      "complementsContrasts": "How this topic would complement or contrast with previous sessions",
      "idealSpeakerProfile": "Description of the ideal speaker profile (role, experience, characteristics) — NOT a specific person"
    }
  ],
  "patternAnalysis": {
    "bestEngagementTypes": "2-3 sentence narrative about what types of speakers and topics have generated the best student engagement, based on debrief ratings, home-run percentages, and student reflections",
    "topResonatingTopics": [
      { "topic": "theme or topic area", "avgRating": 4.5, "homeRunPct": 60 }
    ],
    "successPatterns": ["pattern 1", "pattern 2"],
    "cautionPatterns": ["pattern 1"],
    "dataConfidence": "${confidenceLevel}",
    "insufficientDataNote": ${sessionCount < 3 ? '"A note explaining that with limited data, these are early signals rather than definitive patterns"' : 'null'}
  },
  "generatedAt": "ISO timestamp"
}

Rules:
- recommendations: provide ${sessionCount < 3 ? '2-3' : '3-5'} recommendations, each grounded in specific data from the sessions
- topicArea: be specific — not "leadership" but "Leading Through Organizational Crisis" or "Building Cross-Functional Teams in Startups"
- whyRecommended: always cite specific evidence — which themes are missing, which student signals point to this, which debrief feedback supports it
- studentInterestSignals: 2-4 specific signals from student questions, reflections, or debrief data that point to this topic
- complementsContrasts: explain how this fills a gap or builds on what students have already heard
- idealSpeakerProfile: describe the type of person (role, career stage, industry, experience type) — NEVER suggest a specific named individual
- patternAnalysis.bestEngagementTypes: synthesize what debrief data reveals about what works${sessionsWithDebriefs.length === 0 ? ' (note that no debrief data is available yet)' : ''}
- topResonatingTopics: themes/topics that correlate with higher ratings and more home-run questions${sessionsWithDebriefs.length === 0 ? ' (return empty array if no debrief data)' : ''}
- successPatterns: what speaker characteristics or topic types consistently generate strong engagement
- cautionPatterns: what to be mindful of — NOT negative, but advisory (e.g. "sessions focused purely on theory without personal stories tended to generate fewer home-run questions")
- dataConfidence: must be "${confidenceLevel}"
${sessionCount < 3 ? '- insufficientDataNote: acknowledge limited data honestly; frame recommendations as "early signals" and "initial directions worth exploring"' : '- insufficientDataNote: must be null'}
- Tone: be a thoughtful advisor offering suggestions, not a system giving prescriptive instructions
- Look for BLIND SPOTS: themes students haven't been exposed to yet but their questions and interests suggest they'd benefit from
- Look for EMERGING INTERESTS: topics that appeared in recent student reflections or debrief follow-up suggestions
- Look for COVERAGE GAPS: important business/management areas not yet addressed given the themes covered`
}

export async function generateSpeakerRecommendations(userId: string, semesterId?: string): Promise<void> {
  const input = await fetchInsightsInput(userId, semesterId)
  if (input.sessions.length === 0) return

  const ai = getGeminiClient()

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: buildPrompt(input),
    config: {
      responseMimeType: 'application/json',
      systemInstruction:
        'You are an expert educational advisor and curriculum strategist. Always respond with valid JSON matching the requested schema exactly.',
    },
  })

  const raw = (response.text ?? '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const parsed = JSON.parse(raw) as Partial<SpeakerRecommendations>

  // Override hallucination-prone fields with ground-truth data
  const sessionsWithDebriefs = input.sessions.filter(s => s.debriefRating !== null)

  // Rebuild topResonatingTopics from ground-truth debrief data
  const topResonatingTopics = buildTopResonatingTopics(input)

  // Validate dataConfidence matches actual session count
  const sessionCount = input.sessions.length
  const dataConfidence: SpeakerPatternAnalysis['dataConfidence'] =
    sessionCount < 3 ? 'low' : sessionCount < 7 ? 'moderate' : 'high'

  const patternAnalysis: SpeakerPatternAnalysis = {
    bestEngagementTypes: sessionsWithDebriefs.length === 0
      ? 'No debrief data is available yet. Complete post-session debriefs to unlock engagement pattern analysis.'
      : (parsed.patternAnalysis?.bestEngagementTypes ?? ''),
    topResonatingTopics,
    successPatterns: parsed.patternAnalysis?.successPatterns ?? [],
    cautionPatterns: parsed.patternAnalysis?.cautionPatterns ?? [],
    dataConfidence,
    insufficientDataNote: sessionCount < 3
      ? (parsed.patternAnalysis?.insufficientDataNote ?? `Based on only ${sessionCount} session${sessionCount !== 1 ? 's' : ''}, these are early signals rather than established patterns.`)
      : null,
  }

  const recommendations: SpeakerRecommendations = {
    recommendations: parsed.recommendations ?? [],
    patternAnalysis,
    generatedAt: new Date().toISOString(),
  }

  // Merge into existing class insights
  const existing = await getClassInsights(userId, semesterId)
  const merged: ClassInsights = existing
    ? { ...existing, speakerRecommendations: recommendations, generatedAt: new Date().toISOString() }
    : {
        narrative: '',
        qualityTrend: { direction: 'stable', description: '' },
        topThemes: [],
        watchlist: [],
        themeEvolution: [],
        speakerRecommendations: recommendations,
        generatedAt: new Date().toISOString(),
      }

  await upsertClassInsights(userId, merged, input.sessions.length, semesterId)
}

/**
 * Build topResonatingTopics from ground-truth debrief data.
 * Groups themes by their session's debrief rating and home-run percentage.
 */
function buildTopResonatingTopics(input: InsightsInput): SpeakerPatternAnalysis['topResonatingTopics'] {
  const sessionsWithDebriefs = input.sessions.filter(s => s.debriefRating !== null)
  if (sessionsWithDebriefs.length === 0) return []

  // Aggregate ratings and home-run % by theme
  const themeStats = new Map<string, { totalRating: number; totalHomeRuns: number; totalQuestions: number; count: number }>()

  for (const s of sessionsWithDebriefs) {
    const totalQuestions = s.debriefHomeRunCount + s.debriefFlatCount
    for (const theme of s.themes) {
      const existing = themeStats.get(theme) ?? { totalRating: 0, totalHomeRuns: 0, totalQuestions: 0, count: 0 }
      existing.totalRating += s.debriefRating!
      existing.totalHomeRuns += s.debriefHomeRunCount
      existing.totalQuestions += totalQuestions
      existing.count += 1
      themeStats.set(theme, existing)
    }
  }

  return Array.from(themeStats.entries())
    .map(([topic, stats]) => ({
      topic,
      avgRating: Math.round((stats.totalRating / stats.count) * 10) / 10,
      homeRunPct: stats.totalQuestions > 0 ? Math.round((stats.totalHomeRuns / stats.totalQuestions) * 100) : 0,
    }))
    .sort((a, b) => b.avgRating - a.avgRating || b.homeRunPct - a.homeRunPct)
    .slice(0, 5)
}
