/**
 * @file lib/db/classInsights.ts
 *
 * Persists and retrieves the Gemini-generated cross-session class analysis
 * stored in the `class_insights` table. Each professor has at most one row per
 * "scope" — either one global row (semester_id IS NULL) or one row per
 * semester.
 *
 * `upsertClassInsights` uses a manual check-then-insert/update pattern because
 * Supabase JS's `.upsert()` does not support partial unique indexes (the index
 * is on (user_id) WHERE semester_id IS NULL, and (user_id, semester_id)
 * otherwise).
 *
 * `fetchInsightsInput` is a multi-table aggregation query that assembles all
 * the data Gemini needs: sessions, themes, debrief ratings, and student
 * reflection analyses. It is called from `lib/ai/classInsights.ts` as a
 * fire-and-forget background job after each session upload and debrief
 * completion.
 *
 * Table(s):
 *   - `class_insights` (primary)
 *   - `sessions`, `session_themes`, `student_submissions`,
 *     `session_debriefs`, `student_debrief_analyses` (read-only in fetchInsightsInput)
 *
 * Client: createAdminClient() — all functions here run in background jobs
 *   that do not have a request cookie context.
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { ClassInsights, ThemeEvolutionEntry, QuestionFeedback, DebriefStatus } from '@/types'

/**
 * Retrieves the cached Gemini class analysis for a professor, scoped to a
 * semester or global (no semester filter).
 *
 * Returns `null` rather than throwing when no analysis exists yet — callers
 * should treat null as "not yet generated" and trigger generation if needed.
 *
 * @param userId - The professor's user ID.
 * @param semesterId - Optional semester UUID. When omitted, the global
 *   (semester_id IS NULL) row is returned.
 * @returns The `ClassInsights` JSONB blob, or `null` if not yet generated.
 * @throws Error if the DB query fails.
 *
 * Called by: app/api/analytics/insights/route.ts (GET)
 * Table: class_insights
 * Client: createAdminClient() — bypasses RLS (background job context)
 */
/**
 * Retrieves the cached Gemini class analysis for a professor, scoped to a
 * semester or global (no semester filter).
 *
 * Returns `null` rather than throwing when no analysis exists yet — callers
 * should treat null as "not yet generated" and trigger generation if needed.
 *
 * @param userId - The professor's user ID.
 * @param semesterId - Optional semester UUID. When omitted, the global
 *   (semester_id IS NULL) row is returned.
 * @returns The `ClassInsights` JSONB blob, or `null` if not yet generated.
 * @throws Error if the DB query fails.
 *
 * Called by: app/api/analytics/insights/route.ts (GET)
 * Table: class_insights
 * Client: createAdminClient() — bypasses RLS (background job context)
 */
export async function getClassInsights(userId: string, semesterId?: string): Promise<ClassInsights | null> {
  const supabase = createAdminClient()
  let query = supabase
    .from('class_insights')
    .select('analysis')
    .eq('user_id', userId)
  if (semesterId) {
    query = query.eq('semester_id', semesterId)
  } else {
    query = query.is('semester_id', null)
  }
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  return data ? (data.analysis as ClassInsights) : null
}

/**
 * Saves (or replaces) the Gemini class analysis for a professor's scope.
 *
 * Uses a manual check-then-insert/update pattern because Supabase JS's
 * `.upsert()` cannot resolve partial unique indexes. The check and the
 * subsequent write are NOT in a transaction, which is acceptable here because
 * class insights are regenerated frequently and the worst case is two nearly
 * simultaneous writes overwriting each other (idempotent outcome).
 *
 * @param userId - The professor's user ID.
 * @param analysis - The fully generated `ClassInsights` object to persist.
 * @param sessionCount - The number of sessions included in this analysis
 *   (stored for display/staleness checks).
 * @param semesterId - Optional semester UUID. When omitted, writes to the
 *   global (semester_id IS NULL) row.
 * @returns void — throws if any DB operation fails.
 *
 * Called by: lib/ai/classInsights.ts (fire-and-forget after session upload
 *   and debrief completion)
 * Table: class_insights
 * Client: createAdminClient() — bypasses RLS (background job context)
 */
/**
 * Saves (or replaces) the Gemini class analysis for a professor's scope.
 *
 * Uses a manual check-then-insert/update pattern because Supabase JS's
 * `.upsert()` cannot resolve partial unique indexes. The check and the
 * subsequent write are NOT in a transaction, which is acceptable here because
 * class insights are regenerated frequently and the worst case is two nearly
 * simultaneous writes overwriting each other (idempotent outcome).
 *
 * @param userId - The professor's user ID.
 * @param analysis - The fully generated `ClassInsights` object to persist.
 * @param sessionCount - The number of sessions included in this analysis
 *   (stored for display/staleness checks).
 * @param semesterId - Optional semester UUID. When omitted, writes to the
 *   global (semester_id IS NULL) row.
 * @returns void — throws if any DB operation fails.
 *
 * Called by: lib/ai/classInsights.ts (fire-and-forget after session upload
 *   and debrief completion)
 * Table: class_insights
 * Client: createAdminClient() — bypasses RLS (background job context)
 */
export async function upsertClassInsights(
  userId: string,
  analysis: ClassInsights,
  sessionCount: number,
  semesterId?: string
): Promise<void> {
  const supabase = createAdminClient()

  // Partial unique indexes don't work with Supabase JS upsert, so use
  // check-then-insert/update. See file-level comment for rationale.
  let query = supabase
    .from('class_insights')
    .select('id')
    .eq('user_id', userId)
  if (semesterId) {
    query = query.eq('semester_id', semesterId)
  } else {
    query = query.is('semester_id', null)
  }
  const { data: existing } = await query.maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('class_insights')
      .update({ analysis, session_count: sessionCount, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('class_insights')
      .insert({
        user_id: userId,
        analysis,
        session_count: sessionCount,
        updated_at: new Date().toISOString(),
        semester_id: semesterId ?? null,
      })
    if (error) throw new Error(error.message)
  }
}

/**
 * Shape of the aggregated input passed to `lib/ai/classInsights.ts` for
 * Gemini class analysis generation.
 */
/**
 * Shape of the aggregated input passed to `lib/ai/classInsights.ts` for
 * Gemini class analysis generation.
 *
 * It provides a comprehensive view of a professor's sessions, including details like
 * speaker name, date, submission counts, identified themes, professor's debrief ratings
 * and follow-ups, and student reflection summaries and themes. Additionally, it includes
 * a student leaderboard and a list of students potentially dropping off.
 *
 * Each field is specifically designed to provide context for the AI to generate rich,
 * narrative class insights.
 */
export interface InsightsInput {
  sessions: Array<{
    sessionId: string
    speakerName: string
    date: string
    submissionCount: number
    themes: string[]
    debriefRating: number | null
    debriefHomeRunCount: number
    debriefFlatCount: number
    debriefFollowups: string
    studentReflectionThemes: string[]
    studentReflectionSummary: string | null
  }>
  leaderboard: Array<{ studentName: string; submissionCount: number }>
  dropoff: Array<{ studentName: string; lastSeenSpeaker: string }>
}

/**
 * Assembles all data needed by the Gemini class analysis agent in a single
 * multi-table fetch across sessions, themes, student submissions, professor
 * debriefs, and student debrief analyses.
 *
 * Debrief and student-debrief queries are best-effort (errors are swallowed)
 * so that missing debrief data does not block class insights generation.
 *
 * @param userId - The professor's user ID.
 * @param semesterId - Optional semester UUID to scope the analysis.
 * @returns `InsightsInput` with per-session enriched data, a top-10
 *   leaderboard, and a list of recently absent students.
 * @throws Error if the primary sessions, themes, or submissions queries fail.
 *
 * Called by: lib/ai/classInsights.ts (generateClassInsights)
 * Table: sessions, session_themes, student_submissions, session_debriefs,
 *        student_debrief_analyses
 * Client: createAdminClient() — bypasses RLS (background job context)
 */
/**
 * Assembles all data needed by the Gemini class analysis agent in a single
 * multi-table fetch across sessions, themes, student submissions, professor
 * debriefs, and student debrief analyses.
 *
 * Debrief and student-debrief queries are best-effort (errors are swallowed)
 * so that missing debrief data does not block class insights generation.
 *
 * @param userId - The professor's user ID.
 * @param semesterId - Optional semester UUID to scope the analysis.
 * @returns `InsightsInput` with per-session enriched data, a top-10
 *   leaderboard, and a list of recently absent students.
 * @throws Error if the primary sessions, themes, or submissions queries fail.
 *
 * Called by: lib/ai/classInsights.ts (generateClassInsights)
 * Table: sessions, session_themes, student_submissions, session_debriefs,
 *         student_debrief_analyses
 * Client: createAdminClient() — bypasses RLS (background job context)
 */
export async function fetchInsightsInput(userId: string, semesterId?: string): Promise<InsightsInput> {
  const supabase = createAdminClient()

  // Sessions oldest-first so the AI sees chronological progression
  let sessQuery = supabase
    .from('sessions')
    .select('id, speaker_name, created_at, file_count')
    .eq('user_id', userId)
  if (semesterId) sessQuery = sessQuery.eq('semester_id', semesterId)
  const { data: sessionRows, error: sessErr } = await sessQuery.order('created_at', { ascending: true })
  if (sessErr) throw new Error(sessErr.message)

  const rows = sessionRows ?? []
  const sessionIds = rows.map(s => s.id)

  if (sessionIds.length === 0) {
    return { sessions: [], leaderboard: [], dropoff: [] }
  }

  // Themes per session
  const { data: themeRows, error: themeErr } = await supabase
    .from('session_themes')
    .select('session_id, theme_number, theme_title')
    .in('session_id', sessionIds)
    .order('theme_number', { ascending: true })
  if (themeErr) throw new Error(themeErr.message)

  // Student submissions for leaderboard + dropoff
  const { data: studentRows, error: stuErr } = await supabase
    .from('student_submissions')
    .select('session_id, student_name')
    .in('session_id', sessionIds)
  if (stuErr) throw new Error(stuErr.message)

  // Completed debriefs for enrichment
  const { data: debriefRows } = await supabase
    .from('session_debriefs')
    .select('session_id, overall_rating, questions_feedback, followup_topics, status')
    .in('session_id', sessionIds)
    .eq('status', 'complete')

  // Student debrief analyses (reflection themes + summary)
  const { data: studentDebriefRows } = await supabase
    .from('student_debrief_analyses')
    .select('session_id, analysis')
    .in('session_id', sessionIds)

  // Group themes by session
  const themesBySession = new Map<string, string[]>()
  for (const t of themeRows ?? []) {
    const list = themesBySession.get(t.session_id) ?? []
    list.push(t.theme_title)
    themesBySession.set(t.session_id, list)
  }

  // Group debriefs by session
  const debriefBySession = new Map<string, { rating: number | null; homeRuns: number; flats: number; followups: string }>()
  for (const d of debriefRows ?? []) {
    const feedback = (d.questions_feedback ?? []) as QuestionFeedback[]
    debriefBySession.set(d.session_id, {
      rating: d.overall_rating,
      homeRuns: feedback.filter(q => q.status === 'home_run').length,
      flats: feedback.filter(q => q.status === 'flat').length,
      followups: d.followup_topics ?? '',
    })
  }

  // Group student debrief analyses by session
  const studentDebriefBySession = new Map<string, { themes: string[]; summary: string | null }>()
  for (const row of studentDebriefRows ?? []) {
    const analysis = row.analysis as { reflection_themes?: Array<{ name: string }>; summary?: string } | null
    studentDebriefBySession.set(row.session_id, {
      themes: (analysis?.reflection_themes ?? []).map(t => t.name),
      summary: analysis?.summary ?? null,
    })
  }

  const sessions: InsightsInput['sessions'] = rows.map(s => {
    const db = debriefBySession.get(s.id)
    const sd = studentDebriefBySession.get(s.id)
    return {
      sessionId: s.id,
      speakerName: s.speaker_name,
      date: s.created_at,
      submissionCount: s.file_count,
      themes: themesBySession.get(s.id) ?? [],
      debriefRating: db?.rating ?? null,
      debriefHomeRunCount: db?.homeRuns ?? 0,
      debriefFlatCount: db?.flats ?? 0,
      debriefFollowups: db?.followups ?? '',
      studentReflectionThemes: sd?.themes ?? [],
      studentReflectionSummary: sd?.summary ?? null,
    }
  })

  // Leaderboard
  const countByStudent = new Map<string, number>()
  const lastSeenByStudent = new Map<string, { speaker: string; date: string }>()

  for (const row of studentRows ?? []) {
    countByStudent.set(row.student_name, (countByStudent.get(row.student_name) ?? 0) + 1)
    const sess = sessions.find(s => s.sessionId === row.session_id)
    if (sess) {
      const existing = lastSeenByStudent.get(row.student_name)
      if (!existing || sess.date > existing.date) {
        lastSeenByStudent.set(row.student_name, { speaker: sess.speakerName, date: sess.date })
      }
    }
  }

  const leaderboard = Array.from(countByStudent.entries())
    .map(([studentName, submissionCount]) => ({ studentName, submissionCount }))
    .sort((a, b) => b.submissionCount - a.submissionCount)
    .slice(0, 10)

  // Simplified drop-off heuristic for AI context: absent from the last 2 sessions.
  // This is intentionally looser than the analytics page's 60/33 algorithm —
  // the AI uses it for narrative context, not precise reporting.
  const recentSessions = sessions.slice(-2)
  const recentStudents = new Set(
    (studentRows ?? [])
      .filter(r => recentSessions.some(s => s.sessionId === r.session_id))
      .map(r => r.student_name)
  )
  const allStudents = new Set((studentRows ?? []).map(r => r.student_name))
  const dropoff = Array.from(allStudents)
    .filter(name => !recentStudents.has(name) && sessions.length >= 2)
    .map(name => ({
      studentName: name,
      lastSeenSpeaker: lastSeenByStudent.get(name)?.speaker ?? 'Unknown',
    }))
    .slice(0, 10)

  return { sessions, leaderboard, dropoff }
}
