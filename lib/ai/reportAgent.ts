/**
 * @file lib/ai/reportAgent.ts
 *
 * Generates comprehensive semester reports that combine structured data sections
 * (no AI required) with AI-narrated analytical sections — all assembled in a
 * single on-demand generation pass and persisted as a `ReportContent` JSON blob.
 *
 * ## Report structure
 * Up to 9 sections, each independently toggleable via `ReportConfig.includedSections`:
 *
 * **Pure-data sections** (built from DB data, no Gemini call):
 * - `semester_at_a_glance` — aggregate stats: sessions, submissions, students, tier dist
 * - `session_summaries` — per-session cards with themes and debrief highlights
 * - `student_engagement` — participation tier buckets, top contributors, drop-offs
 * - `appendix_roster` — full alphabetical roster with per-student participation rates
 *
 * **AI-narrated sections** (Gemini generates narrative prose, ground-truth data added):
 * - `executive_summary` — 2-3 paragraph synthesis of the semester
 * - `theme_evolution` — how themes shifted across speakers chronologically
 * - `student_growth` — standout development stories from student profiles
 * - `blind_spots` — underexplored topics + actionable recommendations
 * - `speaker_effectiveness` — speaker-by-speaker rating and question quality analysis
 * - `question_quality` — how tier distribution evolved over the semester
 *
 * ## Where it fits
 * - Called by: app/api/reports/generate/route.ts
 * - Persists to: `semester_reports` via lib/db/reports.ts
 * - Exported via: app/api/reports/[id]/download/route.ts (PDF/DOCX)
 * - Reads from: `session_debriefs`, `student_profiles`, `student_submissions`,
 *               `session_tier_data` (via createAdminClient for cross-table reads)
 *
 * Uses: lib/ai/geminiClient.ts, lib/db/analytics.ts, lib/db/themes.ts,
 *       lib/db/classInsights.ts, lib/db/tierData.ts, lib/db/reports.ts
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import { createAdminClient } from '@/lib/supabase/server'
import { getAnalytics } from '@/lib/db/analytics'
import { getThemeFrequency, type ThemeFrequency } from '@/lib/db/themes'
import { fetchInsightsInput, getClassInsights } from '@/lib/db/classInsights'
import type { InsightsInput } from '@/lib/db/classInsights'
import { getTierDataBySessionIds } from '@/lib/db/tierData'
import { insertReport } from '@/lib/db/reports'
import type {
  ReportConfig,
  ReportContent,
  AnalyticsData,
  ClassInsights,
  SessionTierData,
  ExecutiveSummarySection,
  SemesterGlanceSection,
  SessionSummariesSection,
  SessionSummaryEntry,
  ThemeEvolutionSection,
  StudentEngagementSection,
  StudentGrowthSection,
  QuestionQualitySection,
  BlindSpotsSection,
  SpeakerEffectivenessSection,
  SpeakerRanking,
  AppendixRosterSection,
  RosterEntry,
  QuestionFeedback,
} from '@/types'

// ── Gemini setup ──

/** Returns the lazy Gemini client singleton. Keeps section builders DRY. */
const getAI = () => getGeminiClient()

/** Returns the configured Gemini model name. Keeps section builders DRY. */
const getModel = () => getGeminiModel()

/**
 * Strips markdown code fences from a Gemini JSON response.
 * Gemini occasionally wraps JSON in ```json ... ``` even when responseMimeType
 * is set to 'application/json'. This ensures JSON.parse always receives clean input.
 */
function cleanJSON(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

/**
 * Thin helper that calls Gemini with JSON mode and parses the response.
 * All AI-narrated section builders delegate to this to keep error handling
 * and JSON stripping in one place.
 *
 * @param prompt - The full prompt string for the section
 * @param systemInstruction - The system instruction for the section
 * @returns Parsed JSON response cast to type T
 * @throws SyntaxError if Gemini returns invalid JSON
 */
async function callGemini<T>(prompt: string, systemInstruction: string): Promise<T> {
  const ai = getAI()
  const response = await ai.models.generateContent({
    model: getModel(),
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      systemInstruction,
    },
  })
  const raw = cleanJSON((response.text ?? '').trim())
  return JSON.parse(raw) as T
}

// ── Aggregated data bag passed to section builders ──

/**
 * All data needed to build every section of the report, assembled once by
 * `aggregateData()` and then passed to every section builder function.
 *
 * Using a single shared bag avoids redundant DB round-trips and makes the
 * parallel section generation step in `generateSemesterReport()` cleaner.
 */
interface ReportData {
  analytics: AnalyticsData
  themeFrequency: ThemeFrequency[]
  insightsInput: InsightsInput
  classInsights: ClassInsights | null
  /** Map of sessionId → tier distribution data; only populated sessions appear */
  tierDataMap: Map<string, SessionTierData>
  /** Map of sessionId → debrief info; only completed debriefs appear */
  debriefMap: Map<string, {
    rating: number | null
    aiSummary: string | null
    questionsFeedback: QuestionFeedback[]
    followupTopics: string
  }>
  /** Map of studentName → Set of sessionIds they submitted questions for */
  studentParticipation: Map<string, Set<string>>
  totalStudents: number
}

// ── Main entry point ──

/**
 * Generates a comprehensive semester report and persists it to the database.
 *
 * Orchestrates the full report generation pipeline:
 *  1. Aggregates all required data in parallel (`aggregateData`)
 *  2. Builds pure-data sections synchronously (no AI cost)
 *  3. Fires all AI-narrated section generators in parallel (`Promise.all`)
 *  4. Assembles the final `ReportContent` object and inserts it via `insertReport`
 *
 * Only sections listed in `config.includedSections` are generated; excluded
 * sections are omitted from the content object entirely (not set to null/undefined).
 * The `speaker_effectiveness` section is additionally skipped when no completed
 * debriefs exist; `question_quality` is skipped when no tier data exists.
 *
 * @param userId - The authenticated professor's user ID (used for all DB queries)
 * @param config - Report configuration: title, included sections, optional date range
 * @returns `{ reportId, content }` — the persisted report's ID and its full content
 *
 * @usedBy app/api/reports/generate/route.ts (POST handler)
 */
export async function generateSemesterReport(
  userId: string,
  config: ReportConfig
): Promise<{ reportId: string; content: ReportContent }> {
  // Step 1: Aggregate data in parallel
  const data = await aggregateData(userId, config)

  const sessionIds = data.analytics.sessions.map(s => s.sessionId)
  const included = new Set(config.includedSections)

  // Step 2: Build pure-data sections (no AI)
  const semesterAtAGlance = included.has('semester_at_a_glance')
    ? buildSemesterAtAGlance(data)
    : undefined

  const sessionSummaries = included.has('session_summaries')
    ? buildSessionSummaries(data)
    : undefined

  const studentEngagement = included.has('student_engagement')
    ? buildStudentEngagement(data)
    : undefined

  const appendixRoster = included.has('appendix_roster')
    ? buildAppendixRoster(data)
    : undefined

  // Step 3: AI-generated sections in parallel (only if included)
  const [
    executiveSummary,
    themeEvolution,
    studentGrowth,
    blindSpots,
    speakerEffectiveness,
    questionQuality,
  ] = await Promise.all([
    included.has('executive_summary')
      ? generateExecutiveSummary(data)
      : Promise.resolve(undefined),
    included.has('theme_evolution')
      ? generateThemeEvolution(data)
      : Promise.resolve(undefined),
    included.has('student_growth')
      ? generateStudentGrowthHighlights(data)
      : Promise.resolve(undefined),
    included.has('blind_spots')
      ? generateBlindSpotsAndRecs(data)
      : Promise.resolve(undefined),
    included.has('speaker_effectiveness') && data.debriefMap.size > 0
      ? generateSpeakerEffectiveness(data)
      : Promise.resolve(undefined),
    included.has('question_quality') && data.tierDataMap.size > 0
      ? generateQualityTrendNarrative(data)
      : Promise.resolve(undefined),
  ])

  // Step 4: Assemble and save
  const content: ReportContent = {
    generatedAt: new Date().toISOString(),
    config,
    ...(executiveSummary ? { executive_summary: executiveSummary } : {}),
    ...(semesterAtAGlance ? { semester_at_a_glance: semesterAtAGlance } : {}),
    ...(sessionSummaries ? { session_summaries: sessionSummaries } : {}),
    ...(themeEvolution ? { theme_evolution: themeEvolution } : {}),
    ...(studentEngagement ? { student_engagement: studentEngagement } : {}),
    ...(studentGrowth ? { student_growth: studentGrowth } : {}),
    ...(questionQuality ? { question_quality: questionQuality } : {}),
    ...(blindSpots ? { blind_spots: blindSpots } : {}),
    ...(speakerEffectiveness ? { speaker_effectiveness: speakerEffectiveness } : {}),
    ...(appendixRoster ? { appendix_roster: appendixRoster } : {}),
  }

  const report = await insertReport(userId, config.title, config, content, sessionIds)
  return { reportId: report.id, content }
}

// ── Step 1: Data aggregation ──

/**
 * Fetches and assembles all raw data needed to build the report sections.
 *
 * Runs four top-level queries in parallel (analytics, theme frequency, insights
 * input, class insights), then applies the optional date range filter to the
 * session list. After filtering, three additional queries run in parallel
 * (tier data, debriefs, student participation) scoped to only the filtered
 * session IDs to keep the data bag consistent.
 *
 * The leaderboard and dropoff arrays inside `analytics` are NOT re-filtered
 * after the date range is applied — doing so would require a full re-query of
 * student submissions, which is deferred for performance reasons.
 *
 * @param userId - The professor's user ID, scoped to all DB reads
 * @param config - The report config, used to apply optional date range filtering
 * @returns A fully populated `ReportData` bag ready for section builders
 */
async function aggregateData(userId: string, config: ReportConfig): Promise<ReportData> {
  const [analytics, themeFrequency, insightsInput, classInsights] = await Promise.all([
    getAnalytics(userId),
    getThemeFrequency(userId),
    fetchInsightsInput(userId),
    getClassInsights(userId),
  ])

  // Filter sessions by date range if provided
  const filterByDate = <T extends { date: string }>(items: T[]): T[] => {
    if (!config.dateRange) return items
    const { start, end } = config.dateRange
    return items.filter(item => item.date >= start && item.date <= end)
  }

  analytics.sessions = filterByDate(analytics.sessions)
  insightsInput.sessions = insightsInput.sessions.filter(s => {
    if (!config.dateRange) return true
    return s.date >= config.dateRange.start && s.date <= config.dateRange.end
  })

  // Recalculate meta after filtering
  const sessionIds = analytics.sessions.map(s => s.sessionId)
  analytics.meta.totalSessions = analytics.sessions.length

  // Filter leaderboard and dropoff to only include data from filtered sessions
  // (these are already computed from all sessions, but we keep them as-is since
  // re-filtering would require re-querying student submissions)

  // Fetch tier data and debriefs in parallel for the filtered session set
  const [tierDataMap, debriefMap, studentParticipation] = await Promise.all([
    getTierDataBySessionIds(sessionIds),
    fetchDebriefs(sessionIds),
    fetchStudentParticipation(userId, sessionIds),
  ])

  const totalStudents = new Set(
    Array.from(studentParticipation.keys())
  ).size

  return {
    analytics,
    themeFrequency,
    insightsInput,
    classInsights,
    tierDataMap,
    debriefMap,
    studentParticipation,
    totalStudents,
  }
}

/**
 * Fetches completed debrief records for the given session IDs.
 *
 * Only rows with `status = 'complete'` are included — in-progress debriefs are
 * excluded because their data is partial and would skew speaker effectiveness ratings.
 * Returns an empty Map if no session IDs are provided (short-circuits the DB call).
 *
 * @param sessionIds - Array of session UUIDs to fetch debriefs for
 * @returns Map of sessionId → debrief summary fields (rating, aiSummary, feedback, followups)
 */
async function fetchDebriefs(sessionIds: string[]): Promise<ReportData['debriefMap']> {
  const map = new Map<string, {
    rating: number | null
    aiSummary: string | null
    questionsFeedback: QuestionFeedback[]
    followupTopics: string
  }>()
  if (sessionIds.length === 0) return map

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('session_debriefs')
    .select('session_id, overall_rating, ai_summary, questions_feedback, followup_topics, status')
    .in('session_id', sessionIds)
    .eq('status', 'complete')

  if (error || !data) return map

  for (const row of data) {
    map.set(row.session_id, {
      rating: row.overall_rating,
      aiSummary: row.ai_summary,
      questionsFeedback: (row.questions_feedback ?? []) as QuestionFeedback[],
      followupTopics: row.followup_topics ?? '',
    })
  }
  return map
}

/**
 * Builds a map of student name → set of session IDs they participated in,
 * scoped to the filtered session list.
 *
 * Used by both the `student_engagement` section (participation tier buckets,
 * top contributors) and the `appendix_roster` section (per-student rates).
 * Querying `student_submissions` rather than a pre-aggregated table ensures
 * the counts reflect actual submission records, not cached counters.
 *
 * Note: `userId` is not used in the query body — participation is derived
 * from session IDs which are already scoped to the professor via `aggregateData`.
 *
 * @param userId - The professor's user ID (kept for interface consistency)
 * @param sessionIds - The filtered session UUIDs to scope the query
 * @returns Map of studentName → Set<sessionId>
 */
async function fetchStudentParticipation(
  userId: string,
  sessionIds: string[]
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  if (sessionIds.length === 0) return map

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_submissions')
    .select('student_name, session_id')
    .in('session_id', sessionIds)

  if (error || !data) return map

  for (const row of data) {
    if (!map.has(row.student_name)) map.set(row.student_name, new Set())
    map.get(row.student_name)!.add(row.session_id)
  }
  return map
}

// ── Step 2: Pure-data section builders ──

/**
 * Builds the `semester_at_a_glance` section — aggregate stats for the semester.
 *
 * Pure data: no Gemini call. Aggregates total submissions, students, and average
 * submissions per session directly from the analytics data bag. The tier
 * distribution is computed by summing `tierCounts` across all sessions in
 * `tierDataMap` so the report shows the overall quality distribution at a glance.
 *
 * @param data - The fully populated report data bag
 * @returns Populated `SemesterGlanceSection` object
 */
function buildSemesterAtAGlance(data: ReportData): SemesterGlanceSection {
  const { analytics, tierDataMap } = data
  const totalSubmissions = analytics.sessions.reduce((sum, s) => sum + s.submissionCount, 0)
  const avgSubmissionsPerSession = analytics.sessions.length > 0
    ? Math.round((totalSubmissions / analytics.sessions.length) * 10) / 10
    : 0

  // Aggregate tier distribution across all sessions
  const overallTierDist: Record<string, number> = {}
  for (const [, td] of tierDataMap) {
    for (const [tier, count] of Object.entries(td.tierCounts)) {
      overallTierDist[tier] = (overallTierDist[tier] ?? 0) + count
    }
  }

  return {
    totalSessions: analytics.sessions.length,
    totalSubmissions,
    totalStudents: data.totalStudents,
    avgSubmissionsPerSession,
    sessionsOverTime: analytics.sessions.map(s => ({
      speakerName: s.speakerName,
      date: s.date,
      submissionCount: s.submissionCount,
    })),
    tierDistribution: overallTierDist,
  }
}

/**
 * Builds the `session_summaries` section — one card per session.
 *
 * Pure data: no Gemini call. Joins session metadata from `insightsInput` with
 * the completed debrief (if any) from `debriefMap` so each card shows themes
 * alongside the professor's post-session rating and AI summary.
 *
 * @param data - The fully populated report data bag
 * @returns Populated `SessionSummariesSection` with one entry per session
 */
function buildSessionSummaries(data: ReportData): SessionSummariesSection {
  const { insightsInput, debriefMap } = data

  const sessions: SessionSummaryEntry[] = insightsInput.sessions.map(s => {
    const debrief = debriefMap.get(s.sessionId)
    return {
      sessionId: s.sessionId,
      speakerName: s.speakerName,
      date: s.date,
      fileCount: s.submissionCount,
      themes: s.themes,
      debriefRating: debrief?.rating ?? null,
      debriefHighlights: debrief?.aiSummary ?? null,
    }
  })

  return { sessions }
}

/**
 * Builds the `student_engagement` section — participation tier buckets and top contributors.
 *
 * Pure data: no Gemini call. Segments students into high/medium/low engagement
 * tiers using thresholds: ≥80% = high, ≥50% = medium, <50% = low. The
 * `topContributors` list is capped at 10 to keep the section skimmable.
 * Secondary sort by sessionCount breaks ties when two students have the same rate.
 *
 * @param data - The fully populated report data bag
 * @returns Populated `StudentEngagementSection` with tier counts, top contributors, and drop-offs
 */
function buildStudentEngagement(data: ReportData): StudentEngagementSection {
  const { analytics, studentParticipation } = data
  const totalSessions = analytics.sessions.length

  let high = 0
  let medium = 0
  let low = 0

  const contributors: Array<{
    studentName: string
    sessionCount: number
    totalSessions: number
    rate: number
  }> = []

  for (const [studentName, sessionSet] of studentParticipation) {
    const sessionCount = sessionSet.size
    const rate = totalSessions > 0 ? Math.round((sessionCount / totalSessions) * 100) : 0

    if (rate >= 80) high++
    else if (rate >= 50) medium++
    else low++

    contributors.push({ studentName, sessionCount, totalSessions, rate })
  }

  // Sort by rate descending, take top 10
  contributors.sort((a, b) => b.rate - a.rate || b.sessionCount - a.sessionCount)
  const topContributors = contributors.slice(0, 10)

  const dropoff = analytics.dropoff.map(d => ({
    studentName: d.studentName,
    lastSeenSpeaker: d.lastSeenSpeaker,
    lastSeenDate: d.lastSeenDate,
  }))

  return {
    totalStudents: data.totalStudents,
    participationTiers: { high, medium, low },
    topContributors,
    dropoff,
  }
}

/**
 * Builds the `appendix_roster` section — full alphabetical student list.
 *
 * Pure data: no Gemini call. Maps every student who participated in at least
 * one session to a `RosterEntry` with their participation rate and the list
 * of sessionIds they attended. Sorted alphabetically by student name for
 * easy reference. Also includes a `sessionOrder` array so the UI can render
 * per-session participation columns in chronological order.
 *
 * @param data - The fully populated report data bag
 * @returns Populated `AppendixRosterSection` with students and session order
 */
function buildAppendixRoster(data: ReportData): AppendixRosterSection {
  const { analytics, studentParticipation } = data
  const totalSessions = analytics.sessions.length

  const students: RosterEntry[] = Array.from(studentParticipation.entries())
    .map(([studentName, sessionSet]) => ({
      studentName,
      participationRate: totalSessions > 0
        ? Math.round((sessionSet.size / totalSessions) * 100)
        : 0,
      sessionsAttended: Array.from(sessionSet),
      totalSessions,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName))

  const sessionOrder = analytics.sessions.map(s => ({
    sessionId: s.sessionId,
    speakerName: s.speakerName,
    date: s.date,
  }))

  return { students, sessionOrder }
}

// ── Step 3: AI-generated section builders ──

/**
 * Generates the `executive_summary` section via Gemini.
 *
 * Feeds aggregate semester metrics, the top 5 recurring themes, the speaker list,
 * and the pre-existing class insights narrative (if available) into a prompt asking
 * for a 2-3 paragraph synthesis of the semester plus a short bullet list of highlights.
 * The returned `keyMetrics` block is assembled from ground-truth data (no AI), so
 * even if the narrative is imprecise, the numbers shown in the report are accurate.
 *
 * @param data - The fully populated report data bag
 * @returns Populated `ExecutiveSummarySection` with narrative, highlights, and keyMetrics
 */
async function generateExecutiveSummary(data: ReportData): Promise<ExecutiveSummarySection> {
  const { analytics, themeFrequency, classInsights, tierDataMap } = data
  const totalSubmissions = analytics.sessions.reduce((sum, s) => sum + s.submissionCount, 0)
  const avgSubmissions = analytics.sessions.length > 0
    ? Math.round((totalSubmissions / analytics.sessions.length) * 10) / 10
    : 0
  const participationRate = analytics.meta.avgRelativeRate

  const topThemes = themeFrequency.slice(0, 5).map(t => t.themeTitle)
  const speakerList = analytics.sessions.map(s => s.speakerName)

  const prompt = `You are writing the executive summary for an end-of-semester report on a university class's guest speaker Q&A sessions.

Key metrics:
- ${analytics.sessions.length} sessions across the semester
- ${totalSubmissions} total student submissions
- ${data.totalStudents} unique students
- ${avgSubmissions} avg submissions per session
- Average participation rate: ${participationRate}%

Speakers hosted: ${speakerList.join(', ')}
Top recurring themes: ${topThemes.join(', ')}
${classInsights?.qualityTrend ? `Quality trend: ${classInsights.qualityTrend.direction} — ${classInsights.qualityTrend.description}` : ''}
${classInsights?.narrative ? `Class insights narrative: ${classInsights.narrative}` : ''}
${data.debriefMap.size > 0 ? `${data.debriefMap.size} sessions have post-session debriefs with professor feedback.` : ''}

Return JSON:
{
  "narrative": "A 2-3 paragraph executive summary synthesizing the semester. Cover: overall engagement level, key themes students cared about, quality evolution, and standout moments. Write in a professional but warm tone suitable for an academic report.",
  "highlights": ["3-5 bullet-point highlights of the most notable findings"]
}`

  const parsed = await callGemini<{ narrative: string; highlights: string[] }>(
    prompt,
    'You are an expert educational report writer. Return valid JSON matching the schema exactly.'
  )

  return {
    narrative: parsed.narrative ?? '',
    highlights: parsed.highlights ?? [],
    keyMetrics: {
      totalSessions: analytics.sessions.length,
      totalSubmissions,
      totalStudents: data.totalStudents,
      avgSubmissionsPerSession: avgSubmissions,
      participationRate,
    },
  }
}

/**
 * Generates the `theme_evolution` section via Gemini.
 *
 * Builds a chronological timeline and a `dominantThemes` list from ground-truth
 * data, then asks Gemini to narrate how themes shifted across speakers. The
 * first/last seen dates for each dominant theme are derived from `insightsInput`
 * rather than from Gemini, so the timeline anchor points are always accurate.
 *
 * @param data - The fully populated report data bag
 * @returns Populated `ThemeEvolutionSection` with narrative, timeline, and dominant themes
 */
async function generateThemeEvolution(data: ReportData): Promise<ThemeEvolutionSection> {
  const { insightsInput, themeFrequency } = data

  // Build timeline from ground-truth data
  const timeline = insightsInput.sessions.map(s => ({
    sessionId: s.sessionId,
    speakerName: s.speakerName,
    date: s.date,
    themes: s.themes,
  }))

  const dominantThemes = themeFrequency.slice(0, 10).map(t => {
    // Find first and last seen dates
    let firstSeen = ''
    let lastSeen = ''
    for (const session of insightsInput.sessions) {
      if (session.themes.includes(t.themeTitle)) {
        if (!firstSeen) firstSeen = session.date
        lastSeen = session.date
      }
    }
    return {
      title: t.themeTitle,
      totalCount: t.count,
      firstSeen,
      lastSeen,
    }
  })

  // Only call AI for the narrative
  const themeTimeline = insightsInput.sessions.map(s => ({
    speaker: s.speakerName,
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    themes: s.themes,
  }))

  const prompt = `You are analyzing how student question themes evolved across a semester of guest speaker sessions.

Theme timeline (chronological):
${JSON.stringify(themeTimeline, null, 2)}

Top recurring themes (by frequency):
${themeFrequency.slice(0, 10).map(t => `- "${t.themeTitle}" (appeared ${t.count} times)`).join('\n')}

Return JSON:
{
  "narrative": "A 2-3 paragraph narrative describing how themes evolved over the semester. Identify: which themes persisted, which emerged late, which faded, and what this reveals about student learning and curiosity. Be specific with theme names and speaker connections."
}`

  const parsed = await callGemini<{ narrative: string }>(
    prompt,
    'You are an expert curriculum analyst. Return valid JSON matching the schema exactly.'
  )

  return {
    narrative: parsed.narrative ?? '',
    timeline,
    dominantThemes,
  }
}

/**
 * Generates the `student_growth` section via Gemini.
 *
 * Fetches `student_profiles` from the DB to enrich participation data with AI-generated
 * growth signals and thinking progressions. Only students with 2+ sessions are included
 * (single-session students lack the arc needed for a growth narrative). The top 20 by
 * participation rate are sent to Gemini; the model returns a class-level narrative and
 * up to 5 individual student growth highlights. Growth profiles are fetched with a try/catch
 * so a DB failure silently degrades to participation-only data rather than crashing the report.
 *
 * @param data - The fully populated report data bag
 * @returns Populated `StudentGrowthSection` with narrative and individual highlights
 */
async function generateStudentGrowthHighlights(data: ReportData): Promise<StudentGrowthSection> {
  const { studentParticipation, analytics, insightsInput } = data

  // Fetch growth profiles for enriched data
  let growthProfiles: Map<string, { signal: string; highlight: string; progression: string }> = new Map()
  try {
    const adminClient = createAdminClient()
    const studentNames = Array.from(studentParticipation.keys())
    if (studentNames.length > 0) {
      const { data: profiles } = await adminClient
        .from('student_profiles')
        .select('student_name, growth_signal, analysis')
        .in('student_name', studentNames)
      for (const p of profiles ?? []) {
        const gi = (p.analysis as { growthIntelligence?: { overallSignal?: string; semesterHighlight?: string; thinkingArc?: { progression?: string } } })?.growthIntelligence
        if (gi) {
          growthProfiles.set(p.student_name, {
            signal: gi.overallSignal ?? p.growth_signal ?? '',
            highlight: gi.semesterHighlight ?? '',
            progression: gi.thinkingArc?.progression ?? '',
          })
        }
      }
    }
  } catch {
    // Continue without growth profiles if fetch fails
  }

  // Build per-student summary for AI
  const studentSummaries = Array.from(studentParticipation.entries())
    .filter(([, sessions]) => sessions.size >= 2) // Only students with 2+ sessions
    .map(([name, sessionSet]) => {
      const sessionsChronological = analytics.sessions
        .filter(s => sessionSet.has(s.sessionId))
        .map(s => s.speakerName)
      const gp = growthProfiles.get(name)
      return {
        name,
        sessionCount: sessionSet.size,
        totalSessions: analytics.sessions.length,
        rate: Math.round((sessionSet.size / analytics.sessions.length) * 100),
        speakers: sessionsChronological,
        ...(gp?.signal ? { growthSignal: gp.signal } : {}),
        ...(gp?.highlight ? { semesterHighlight: gp.highlight } : {}),
        ...(gp?.progression ? { thinkingProgression: gp.progression } : {}),
      }
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 20) // Limit context to top 20

  const leaderboardNames = insightsInput.leaderboard.map(l => l.studentName)
  const dropoffNames = insightsInput.dropoff.map(d => d.studentName)

  const prompt = `You are identifying standout student growth and intellectual development across a semester of guest speaker Q&A sessions. Focus on development stories, not just participation.

Student data (top 20 by rate, enriched with AI growth profiles where available):
${JSON.stringify(studentSummaries, null, 2)}

Leaderboard (most active): ${leaderboardNames.slice(0, 5).join(', ')}
Students who dropped off: ${dropoffNames.length > 0 ? dropoffNames.join(', ') : 'None'}
Total sessions in semester: ${analytics.sessions.length}

Return JSON:
{
  "narrative": "A 2-3 paragraph summary of notable student growth and intellectual development. Weave together participation data with growth signals and thinking progressions. Mention specific students by name.",
  "highlights": [
    {
      "studentName": "Name",
      "narrative": "2-3 sentences about this student's intellectual development story",
      "sessionsParticipated": number,
      "growthSignal": "their growth signal if available, or empty string",
      "thinkingProgression": "1 sentence summary of their thinking evolution, or empty string"
    }
  ]
}

Rules:
- highlights: max 5 students, prioritize the most compelling intellectual development stories
- If growthSignal and semesterHighlight data is available, USE IT
- Use only names from the provided data
- sessionsParticipated must match the data provided
- This is NOT a grading tool — frame growth as intellectual development`

  const parsed = await callGemini<{
    narrative: string
    highlights: Array<{
      studentName: string
      narrative: string
      sessionsParticipated: number
      growthSignal?: string
      thinkingProgression?: string
    }>
  }>(
    prompt,
    'You are an expert educational data analyst. Return valid JSON matching the schema exactly.'
  )

  return {
    narrative: parsed.narrative ?? '',
    highlights: (parsed.highlights ?? []).map(h => ({
      studentName: h.studentName ?? '',
      narrative: h.narrative ?? '',
      sessionsParticipated: h.sessionsParticipated ?? 0,
      growthSignal: h.growthSignal || undefined,
      thinkingProgression: h.thinkingProgression || undefined,
    })),
  }
}

/**
 * Generates the `blind_spots` section via Gemini.
 *
 * Sends the top 15 themes, speaker list, class narrative, and professor-noted
 * follow-up topics to Gemini, which identifies 3-5 underexplored topics and
 * generates 3-5 actionable recommendations for the next semester (e.g., speaker
 * types to prioritize, prompt strategies, structural changes).
 *
 * @param data - The fully populated report data bag
 * @returns Populated `BlindSpotsSection` with blindSpots and recommendations arrays
 */
async function generateBlindSpotsAndRecs(data: ReportData): Promise<BlindSpotsSection> {
  const { themeFrequency, classInsights, insightsInput, debriefMap } = data

  const themes = themeFrequency.slice(0, 15).map(t => t.themeTitle)
  const speakers = insightsInput.sessions.map(s => s.speakerName)

  // Gather debrief followup topics if any
  const followupTopics: string[] = []
  for (const [, d] of debriefMap) {
    if (d.followupTopics) followupTopics.push(d.followupTopics)
  }

  const prompt = `You are analyzing a semester of guest speaker Q&A sessions for a university class to identify blind spots and make recommendations for next semester.

Themes students explored: ${themes.join(', ')}
Speakers hosted: ${speakers.join(', ')}
${classInsights?.narrative ? `Class-level insight: ${classInsights.narrative}` : ''}
${classInsights?.watchlist && classInsights.watchlist.length > 0 ? `Students on watchlist: ${classInsights.watchlist.map(w => `${w.studentName} (${w.reason})`).join('; ')}` : ''}
${followupTopics.length > 0 ? `Professor-noted followup topics: ${followupTopics.join('; ')}` : ''}
${classInsights?.qualityTrend ? `Question quality trend: ${classInsights.qualityTrend.direction}` : ''}

Return JSON:
{
  "blindSpots": [
    {
      "title": "Short title for the blind spot",
      "description": "1-2 sentences explaining what was underexplored or missing from student questions"
    }
  ],
  "recommendations": [
    {
      "text": "A specific, actionable recommendation",
      "reason": "Why this would address a gap"
    }
  ]
}

Rules:
- blindSpots: 3-5 items. Focus on topics students never asked about but should have, perspectives missing from discussions, or types of questions never attempted.
- recommendations: 3-5 items. Each should be specific and actionable for next semester (e.g., suggest speaker types, prompt strategies, structural changes).`

  const parsed = await callGemini<{
    blindSpots: Array<{ title: string; description: string }>
    recommendations: Array<{ text: string; reason: string }>
  }>(
    prompt,
    'You are an expert curriculum advisor. Return valid JSON matching the schema exactly.'
  )

  return {
    blindSpots: (parsed.blindSpots ?? []).map(b => ({
      title: b.title ?? '',
      description: b.description ?? '',
    })),
    recommendations: (parsed.recommendations ?? []).map(r => ({
      text: r.text ?? '',
      reason: r.reason ?? '',
    })),
  }
}

/**
 * Generates the `speaker_effectiveness` section via Gemini.
 *
 * Computes ground-truth `SpeakerRanking` entries for every session (combining debrief
 * rating with average question tier) and then asks Gemini to narrate patterns across
 * speakers. The weighted average tier is computed by (Σ tier * count) / totalQuestions —
 * a lower average tier indicates higher question quality (tier 1 is best).
 * Only called when `debriefMap.size > 0` (checked in the main orchestrator).
 *
 * @param data - The fully populated report data bag
 * @returns Populated `SpeakerEffectivenessSection` with narrative and per-speaker rankings
 */
async function generateSpeakerEffectiveness(data: ReportData): Promise<SpeakerEffectivenessSection> {
  const { analytics, debriefMap, tierDataMap } = data

  // Build rankings from ground-truth data
  const rankings: SpeakerRanking[] = analytics.sessions.map(s => {
    const debrief = debriefMap.get(s.sessionId)
    const tierData = tierDataMap.get(s.sessionId)

    let avgTier: number | null = null
    if (tierData) {
      const entries = Object.entries(tierData.tierCounts)
      const totalQuestions = entries.reduce((sum, [, count]) => sum + count, 0)
      if (totalQuestions > 0) {
        const weightedSum = entries.reduce((sum, [tier, count]) => sum + (Number(tier) * count), 0)
        avgTier = Math.round((weightedSum / totalQuestions) * 10) / 10
      }
    }

    return {
      speakerName: s.speakerName,
      sessionId: s.sessionId,
      date: s.date,
      debriefRating: debrief?.rating ?? null,
      avgTier,
      submissionCount: s.submissionCount,
    }
  })

  // Only generate narrative if there are debriefs to analyze
  const speakerSummary = rankings
    .filter(r => r.debriefRating !== null || r.avgTier !== null)
    .map(r => ({
      speaker: r.speakerName,
      rating: r.debriefRating,
      avgTier: r.avgTier,
      submissions: r.submissionCount,
    }))

  const prompt = `You are analyzing guest speaker effectiveness based on professor debrief ratings and question quality tier data.

Speaker data:
${JSON.stringify(speakerSummary, null, 2)}

Note: "rating" is the professor's overall rating of the session (1-5 scale). "avgTier" is the average question quality tier (lower = better, tier 1 is highest quality). "submissions" is how many students submitted questions.

Return JSON:
{
  "narrative": "A 1-2 paragraph analysis of speaker effectiveness. Which speakers generated the best quality questions? Which had the highest professor ratings? Any patterns (e.g., did high-submission sessions correlate with quality)? Be specific with speaker names."
}`

  const parsed = await callGemini<{ narrative: string }>(
    prompt,
    'You are an expert educational program evaluator. Return valid JSON matching the schema exactly.'
  )

  return {
    narrative: parsed.narrative ?? '',
    rankings,
  }
}

/**
 * Generates the `question_quality` section via Gemini.
 *
 * Builds per-session tier distribution data from ground-truth `tierDataMap` entries,
 * then asks Gemini whether quality trended improving, declining, or stable. Gemini's
 * trend value is validated against the allowed literals before being stored — if the
 * model returns an unexpected string, the section defaults to 'stable' rather than
 * propagating a type error. Only called when `tierDataMap.size > 0`.
 *
 * @param data - The fully populated report data bag
 * @returns Populated `QuestionQualitySection` with narrative, trend, per-session tiers, and overall distribution
 */
async function generateQualityTrendNarrative(data: ReportData): Promise<QuestionQualitySection> {
  const { analytics, tierDataMap, classInsights } = data

  // Build per-session tier data
  const perSessionTiers = analytics.sessions
    .filter(s => tierDataMap.has(s.sessionId))
    .map(s => {
      const td = tierDataMap.get(s.sessionId)!
      return {
        sessionId: s.sessionId,
        speakerName: s.speakerName,
        date: s.date,
        tierCounts: td.tierCounts,
      }
    })

  // Overall distribution
  const overallDistribution: Record<string, number> = {}
  for (const session of perSessionTiers) {
    for (const [tier, count] of Object.entries(session.tierCounts)) {
      overallDistribution[tier] = (overallDistribution[tier] ?? 0) + count
    }
  }

  // Summarize for AI prompt
  const tierTimeline = perSessionTiers.map(s => ({
    speaker: s.speakerName,
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tiers: s.tierCounts,
  }))

  const existingTrend = classInsights?.qualityTrend

  const prompt = `You are analyzing question quality trends across a semester of guest speaker Q&A sessions.

Tier data per session (chronological, tier 1 = highest quality):
${JSON.stringify(tierTimeline, null, 2)}

Overall distribution across all sessions: ${JSON.stringify(overallDistribution)}
${existingTrend ? `Previously detected trend: ${existingTrend.direction} — ${existingTrend.description}` : ''}

Return JSON:
{
  "narrative": "A 1-2 paragraph analysis of how question quality evolved over the semester. Did higher-tier questions increase over time? Were certain speakers associated with better questions? What does the trajectory suggest about student learning?",
  "trend": "improving" | "declining" | "stable"
}

Rules:
- trend must be exactly one of: "improving", "declining", "stable"
- Be specific about tier numbers and speaker names in the narrative`

  const parsed = await callGemini<{ narrative: string; trend: 'improving' | 'declining' | 'stable' }>(
    prompt,
    'You are an expert educational data analyst. Return valid JSON matching the schema exactly.'
  )

  const trend = (['improving', 'declining', 'stable'] as const).includes(parsed.trend)
    ? parsed.trend
    : 'stable'

  return {
    narrative: parsed.narrative ?? '',
    trend,
    perSessionTiers,
    overallDistribution,
  }
}
