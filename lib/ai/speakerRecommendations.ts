/**
 * lib/ai/speakerRecommendations.ts
 *
 * Generates AI-powered recommendations for upcoming guest speakers based on
 * cumulative session data — what topics have been covered, what resonated with
 * students, what's been missed, and what the class seems ready to explore next.
 *
 * This is an advisory tool for the professor, not for students or speakers.
 * It analyzes the entire semester's worth of session data (themes, debrief
 * ratings, student reflection themes) and produces:
 *  - Concrete topic area recommendations with evidence-grounded rationale
 *  - Pattern analysis of what speaker types and topics have worked best
 *  - Confidence-calibrated outputs based on how many sessions have run
 *
 * The generated recommendations are merged into the professor's ClassInsights
 * record as the `speakerRecommendations` field rather than stored separately.
 * This keeps all professor-level analytical intelligence in one place.
 *
 * Data sources (via lib/db/classInsights.ts fetchInsightsInput):
 *  - sessions table: session list for the professor/semester
 *  - session_themes table: theme lists per session
 *  - session_debriefs table: ratings, home-run/flat counts, follow-up topics
 *  - student_debrief_analyses table: anonymized student reflection themes
 *
 * Uses: lib/ai/geminiClient.ts, lib/db/classInsights.ts
 * Called by: app/api/analytics/recommendations/route.ts (GET handler, fire-and-forget)
 * Persists to: class_insights table via lib/db/classInsights.ts (upsertClassInsights)
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import { fetchInsightsInput, getClassInsights, upsertClassInsights } from '@/lib/db/classInsights'
import type { ClassInsights, SpeakerRecommendations, SpeakerPatternAnalysis } from '@/types'
import type { InsightsInput } from '@/lib/db/classInsights'

/**
 * Constructs the Gemini prompt for speaker recommendation generation.
 *
 * Builds a session summary array (oldest-first, with debrief data conditionally
 * included) and computes the data confidence level based on session count:
 *  - low: fewer than 3 sessions — early signals only
 *  - moderate: 3–6 sessions — developing patterns
 *  - high: 7+ sessions — established patterns
 *
 * The confidence level is embedded in the prompt to guide Gemini's language
 * (e.g., "early signals worth exploring" vs "established patterns"), and is
 * also validated and overridden in `generateSpeakerRecommendations` to prevent
 * Gemini from hallucinating a different confidence tier.
 *
 * @param input - Aggregated insights input from lib/db/classInsights.ts
 * @returns A fully-formed prompt string ready for Gemini content generation
 */
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

  // Tier the confidence level based on session count. This value is embedded
  // in the prompt AND validated post-generation to avoid Gemini overriding it.
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

/**
 * Generates speaker recommendations and merges them into the professor's
 * class insights record. Fire-and-forget: the caller does not await a return value.
 *
 * Steps:
 *  1. Fetch all sessions + debrief data for this professor (optionally filtered
 *     by semesterId) via fetchInsightsInput in lib/db/classInsights.ts.
 *  2. Short-circuit if no sessions exist (nothing to analyze).
 *  3. Call Gemini with a confidence-calibrated prompt.
 *  4. Strip any accidental markdown fences from the response (defensive — the
 *     responseMimeType should prevent them, but Gemini occasionally wraps output).
 *  5. Override hallucination-prone fields with ground-truth values:
 *     - topResonatingTopics is fully recomputed from debrief data (not trusted from AI)
 *     - dataConfidence is re-derived from session count (not trusted from AI)
 *     - bestEngagementTypes is replaced with a static message if no debriefs exist
 *  6. Merge the recommendations into the existing ClassInsights record, preserving
 *     all other fields (narrative, qualityTrend, topThemes, etc.). If no record
 *     exists yet, create a minimal stub with empty fields.
 *  7. Persist via upsertClassInsights in lib/db/classInsights.ts.
 *
 * @param userId - The professor's user ID (used to scope DB queries)
 * @param semesterId - Optional semester filter; if omitted, spans all sessions
 *
 * @remarks
 * Recommendations are stored as the `speakerRecommendations` field inside the
 * professor's existing `class_insights` record rather than in a separate table.
 * This design keeps all professor-level AI intelligence co-located and avoids a
 * new table join whenever the analytics page loads.
 * When no class_insights record exists yet (e.g., first session), a minimal stub
 * is created so subsequent classInsights.ts runs can merge into it cleanly.
 * @see app/api/analytics/recommendations/route.ts — GET handler that triggers this
 * @see lib/db/classInsights.ts — upsertClassInsights / getClassInsights
 * @see buildTopResonatingTopics — ground-truth helper that overrides AI-computed topic stats
 */
export async function generateSpeakerRecommendations(userId: string, semesterId?: string): Promise<void> {
  // Uses: lib/db/classInsights.ts
  const input = await fetchInsightsInput(userId, semesterId)
  if (input.sessions.length === 0) return

  // Uses: lib/ai/geminiClient.ts
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

  // Strip markdown fences defensively — responseMimeType: 'application/json' should
  // prevent them, but Gemini has been observed wrapping JSON in ```json...``` blocks.
  const raw = (response.text ?? '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const parsed = JSON.parse(raw) as Partial<SpeakerRecommendations>

  // --- Ground-truth override pass ---
  // Gemini can hallucinate or miscompute quantitative fields. We replace
  // specific fields with values derived directly from the input data.

  const sessionsWithDebriefs = input.sessions.filter(s => s.debriefRating !== null)

  // topResonatingTopics is fully recomputed from debrief data — not trusted from AI.
  // See buildTopResonatingTopics for aggregation logic.
  const topResonatingTopics = buildTopResonatingTopics(input)

  // dataConfidence is re-derived from session count to ensure consistency.
  const sessionCount = input.sessions.length
  const dataConfidence: SpeakerPatternAnalysis['dataConfidence'] =
    sessionCount < 3 ? 'low' : sessionCount < 7 ? 'moderate' : 'high'

  const patternAnalysis: SpeakerPatternAnalysis = {
    // If no debriefs exist yet, replace any AI-generated text with a static message
    // that prompts the professor to complete debriefs to unlock this analysis.
    bestEngagementTypes: sessionsWithDebriefs.length === 0
      ? 'No debrief data is available yet. Complete post-session debriefs to unlock engagement pattern analysis.'
      : (parsed.patternAnalysis?.bestEngagementTypes ?? ''),
    topResonatingTopics,
    successPatterns: parsed.patternAnalysis?.successPatterns ?? [],
    cautionPatterns: parsed.patternAnalysis?.cautionPatterns ?? [],
    dataConfidence,
    // insufficientDataNote is only set when session count is below the low threshold.
    // Fallback text is provided in case Gemini omitted the field despite the prompt.
    insufficientDataNote: sessionCount < 3
      ? (parsed.patternAnalysis?.insufficientDataNote ?? `Based on only ${sessionCount} session${sessionCount !== 1 ? 's' : ''}, these are early signals rather than established patterns.`)
      : null,
  }

  const recommendations: SpeakerRecommendations = {
    recommendations: parsed.recommendations ?? [],
    patternAnalysis,
    generatedAt: new Date().toISOString(),
  }

  // Merge into the existing class_insights record to preserve other fields
  // (narrative, qualityTrend, topThemes, watchlist, themeEvolution) that are
  // managed by other agents (e.g., lib/ai/classInsights.ts).
  // Uses: lib/db/classInsights.ts
  const existing = await getClassInsights(userId, semesterId)
  const merged: ClassInsights = existing
    ? { ...existing, speakerRecommendations: recommendations, generatedAt: new Date().toISOString() }
    : {
        // Stub record — other fields will be filled when classInsights.ts runs
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
 * Computes topResonatingTopics from ground-truth debrief data rather than
 * relying on Gemini to derive it. This function is the authoritative source
 * for the `patternAnalysis.topResonatingTopics` field.
 *
 * Algorithm:
 *  - For every session that has a debrief rating, iterate over its themes.
 *  - Accumulate avgRating (mean debrief rating across sessions sharing that theme)
 *    and homeRunPct (home-run questions / total questions across those sessions).
 *  - Note: themes are attributed at the session level (all themes in a session
 *    inherit that session's debrief rating), not at the per-theme level.
 *  - Sort by avgRating descending, then homeRunPct descending as a tiebreaker.
 *  - Return the top 5 themes.
 *
 * Returns an empty array if no sessions have completed debriefs.
 *
 * @param input - Aggregated insights input from lib/db/classInsights.ts
 * @returns Array of up to 5 top-resonating topics with avgRating and homeRunPct
 */
function buildTopResonatingTopics(input: InsightsInput): SpeakerPatternAnalysis['topResonatingTopics'] {
  const sessionsWithDebriefs = input.sessions.filter(s => s.debriefRating !== null)
  if (sessionsWithDebriefs.length === 0) return []

  // Accumulate per-theme stats across all sessions that have debrief data.
  // Each theme key maps to running totals; we average at the end.
  const themeStats = new Map<string, { totalRating: number; totalHomeRuns: number; totalQuestions: number; count: number }>()

  for (const s of sessionsWithDebriefs) {
    // totalQuestions is the sum of home-run + flat counts from the debrief.
    // This is used to compute the home-run percentage for this session.
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
      // Round to 1 decimal place for display
      avgRating: Math.round((stats.totalRating / stats.count) * 10) / 10,
      // Avoid division by zero if no questions were rated (debrief had no feedback items)
      homeRunPct: stats.totalQuestions > 0 ? Math.round((stats.totalHomeRuns / stats.totalQuestions) * 100) : 0,
    }))
    // Primary sort: average rating descending; tiebreaker: home-run percentage descending
    .sort((a, b) => b.avgRating - a.avgRating || b.homeRunPct - a.homeRunPct)
    .slice(0, 5)
}
