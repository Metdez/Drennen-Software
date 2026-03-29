import { createAdminClient, createClient } from '@/lib/supabase/server'
import type {
  PortfolioShare,
  PortfolioShareRow,
  PortfolioConfig,
  SessionRow,
  SessionSummary,
  Session,
  SemesterSummary,
  StudentSummary,
  SemesterReport,
  SemesterReportRow,
  SessionAnalysis,
  SpeakerBriefContent,
  StudentProfile,
  ClassInsights,
} from '@/types'
import { DEFAULT_PORTFOLIO_CONFIG } from '@/types'
import { rowToSession } from '@/lib/utils/transforms'
import type { ThemeFrequency } from '@/lib/db/themes'

// Helper to build SessionSummary from partial session row (without user_id/output)

function toSessionSummary(row: any): SessionSummary {
  return {
    id: row.id,
    speakerName: row.speaker_name,
    createdAt: row.created_at,
    fileCount: row.file_count,
    semesterId: row.semester_id ?? null,
    debriefStatus: null,
    debriefRating: null,
  }
}

// ─── Row transform ──────────────────────────────────────────────────────────

function rowToPortfolioShare(row: PortfolioShareRow): PortfolioShare {
  return {
    id: row.id,
    userId: row.user_id,
    shareToken: row.share_token,
    enabled: row.enabled,
    config: { ...DEFAULT_PORTFOLIO_CONFIG, ...(row.config as PortfolioConfig) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Authenticated functions (professor managing their share) ───────────────

/** Get the professor's portfolio share (authenticated context — uses RLS) */
export async function getPortfolioShare(userId: string): Promise<PortfolioShare | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('portfolio_shares')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return null
  return data ? rowToPortfolioShare(data as PortfolioShareRow) : null
}

/** Create or update the portfolio share config (admin context) */
export async function upsertPortfolioShare(
  userId: string,
  config: PortfolioConfig
): Promise<PortfolioShare> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('portfolio_shares')
    .upsert(
      {
        user_id: userId,
        config,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert portfolio share: ${error.message}`)
  return rowToPortfolioShare(data as PortfolioShareRow)
}

/** Toggle portfolio share on/off — keeps token stable (admin context) */
export async function togglePortfolioShare(
  userId: string,
  enabled: boolean
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('portfolio_shares')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to toggle portfolio share: ${error.message}`)
}

/** Regenerate the share token — old link stops working (admin context) */
export async function regeneratePortfolioToken(userId: string): Promise<PortfolioShare> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('gen_random_uuid')
  if (error) throw new Error(`Failed to generate token: ${error.message}`)

  const newToken = data as string
  const { data: updated, error: updateErr } = await supabase
    .from('portfolio_shares')
    .update({ share_token: newToken, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()

  if (updateErr) throw new Error(`Failed to regenerate token: ${updateErr.message}`)
  return rowToPortfolioShare(updated as PortfolioShareRow)
}

// ─── Public data functions (token-based access, all use admin client) ───────

/** Validate a portfolio share token — returns share if valid & enabled */
export async function getPortfolioByToken(token: string): Promise<PortfolioShare | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('portfolio_shares')
    .select('*')
    .eq('share_token', token)
    .eq('enabled', true)
    .maybeSingle()

  if (error || !data) return null
  return rowToPortfolioShare(data as PortfolioShareRow)
}

// ─── Scope helper ───────────────────────────────────────────────────────────

/** Build a session query filtered by portfolio scope */
function applyScopeFilter(
  
  query: any,
  share: PortfolioShare
) {
  query = query.eq('user_id', share.userId)
  if (share.config.scope === 'semester' && share.config.semesterId) {
    query = query.eq('semester_id', share.config.semesterId)
  }
  return query
}

// ─── Landing page data ──────────────────────────────────────────────────────

export interface PortfolioLandingData {
  semesters: SemesterSummary[]
  sessions: SessionSummary[]
  totalStudents: number
  totalSubmissions: number
  dateRange: { earliest: string; latest: string } | null
  sections: {
    sessions: boolean
    analytics: boolean
    roster: boolean
    reports: boolean
  }
}

export async function getPortfolioLanding(share: PortfolioShare): Promise<PortfolioLandingData> {
  const supabase = createAdminClient()

  // Fetch semesters
  const { data: semesterRows } = await supabase
    .from('semesters')
    .select('id, name, start_date, end_date, status, created_at')
    .eq('user_id', share.userId)
    .order('created_at', { ascending: false })

  // Count sessions per semester for semester summaries
  const semesterIds = (semesterRows ?? []).map(s => s.id)
  let semesterSessionCounts = new Map<string, number>()
  if (semesterIds.length > 0) {
    const { data: semSessions } = await supabase
      .from('sessions')
      .select('id, semester_id')
      .in('semester_id', semesterIds)
    for (const s of semSessions ?? []) {
      semesterSessionCounts.set(s.semester_id, (semesterSessionCounts.get(s.semester_id) ?? 0) + 1)
    }
  }

  const semesters: SemesterSummary[] = (semesterRows ?? []).map(s => ({
    id: s.id,
    name: s.name,
    status: s.status as 'active' | 'archived',
    sessionCount: semesterSessionCounts.get(s.id) ?? 0,
    startDate: s.start_date,
    endDate: s.end_date,
  }))

  // Fetch sessions (scoped)
  let sessQuery = supabase
    .from('sessions')
    .select('id, speaker_name, created_at, file_count, semester_id')
  sessQuery = applyScopeFilter(sessQuery, share)
  const { data: sessionRows } = await sessQuery.order('created_at', { ascending: false })

  const sessions = (sessionRows ?? []).map((r: unknown) => toSessionSummary(r))

  // Student count + submission count
  const sessionIds = sessions.map(s => s.id)
  let totalStudents = 0
  let totalSubmissions = 0
  if (sessionIds.length > 0) {
    const { data: subs } = await supabase
      .from('student_submissions')
      .select('student_name, session_id')
      .in('session_id', sessionIds)
    totalSubmissions = (subs ?? []).length
    totalStudents = new Set((subs ?? []).map(s => s.student_name)).size
  }

  // Date range
  const dates = sessions.map(s => s.createdAt).sort()
  const dateRange = dates.length > 0
    ? { earliest: dates[0], latest: dates[dates.length - 1] }
    : null

  // Check what sections are available
  let hasReports = false
  if (share.config.includeReports) {
    const { count } = await supabase
      .from('semester_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', share.userId)
    hasReports = (count ?? 0) > 0
  }

  return {
    semesters,
    sessions,
    totalStudents,
    totalSubmissions,
    dateRange,
    sections: {
      sessions: sessions.length > 0,
      analytics: sessions.length > 0,
      roster: share.config.includeStudentProfiles && totalStudents > 0,
      reports: share.config.includeReports && hasReports,
    },
  }
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export async function getPortfolioSessions(
  share: PortfolioShare,
  semesterId?: string
): Promise<SessionSummary[]> {
  const supabase = createAdminClient()
  let query = supabase
    .from('sessions')
    .select('id, speaker_name, created_at, file_count, semester_id')
    .eq('user_id', share.userId)

  if (semesterId) {
    query = query.eq('semester_id', semesterId)
  } else if (share.config.scope === 'semester' && share.config.semesterId) {
    query = query.eq('semester_id', share.config.semesterId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []).map((r: unknown) => toSessionSummary(r))
}

// ─── Session detail ─────────────────────────────────────────────────────────

export interface PortfolioSessionDetail {
  session: Session
  themes: string[]
  analysis: SessionAnalysis | null
  debrief: { aiSummary: string | null; overallRating: number | null; status: string } | null
  brief: SpeakerBriefContent | null
}

export async function getPortfolioSessionDetail(
  share: PortfolioShare,
  sessionId: string
): Promise<PortfolioSessionDetail | null> {
  const supabase = createAdminClient()

  // Verify session belongs to this portfolio's user + scope
  const { data: sessionRow, error: sessErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', share.userId)
    .single()

  if (sessErr || !sessionRow) return null

  // Scope check
  if (share.config.scope === 'semester' && share.config.semesterId) {
    if (sessionRow.semester_id !== share.config.semesterId) return null
  }

  const session = rowToSession(sessionRow as SessionRow)

  // Fetch all related data in parallel
  const [themesResult, analysisResult, debriefResult, briefResult] = await Promise.all([
    supabase
      .from('session_themes')
      .select('theme_title')
      .eq('session_id', sessionId)
      .order('theme_number', { ascending: true }),
    supabase
      .from('session_analyses')
      .select('analysis')
      .eq('session_id', sessionId)
      .maybeSingle(),
    supabase
      .from('session_debriefs')
      .select('ai_summary, overall_rating, status')
      .eq('session_id', sessionId)
      .maybeSingle(),
    supabase
      .from('speaker_briefs')
      .select('content, edited_content')
      .eq('session_id', sessionId)
      .maybeSingle(),
  ])

  const themes = (themesResult.data ?? []).map(t => (t as { theme_title: string }).theme_title)
  const analysis = analysisResult.data ? (analysisResult.data.analysis as SessionAnalysis) : null
  const debrief = debriefResult.data
    ? {
        aiSummary: debriefResult.data.ai_summary as string | null,
        overallRating: debriefResult.data.overall_rating as number | null,
        status: debriefResult.data.status as string,
      }
    : null
  const brief = briefResult.data
    ? ((briefResult.data.edited_content ?? briefResult.data.content) as SpeakerBriefContent)
    : null

  return { session, themes, analysis, debrief, brief }
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface PortfolioAnalyticsData {
  themeFrequency: ThemeFrequency[]
  classInsights: ClassInsights | null
  themeEvolution: Array<{
    sessionId: string
    speakerName: string
    createdAt: string
    themes: string[]
  }>
}

export async function getPortfolioAnalytics(share: PortfolioShare): Promise<PortfolioAnalyticsData> {
  const supabase = createAdminClient()

  // Sessions for scope
  let sessQuery = supabase
    .from('sessions')
    .select('id, speaker_name, created_at, semester_id')
  sessQuery = applyScopeFilter(sessQuery, share)
  const { data: sessionRows } = await sessQuery.order('created_at', { ascending: true })
  const sessions = sessionRows ?? []
  const sessionIds = sessions.map(s => s.id)

  // Theme frequency
  let themeFrequency: ThemeFrequency[] = []
  if (sessionIds.length > 0) {
    const { data: themeRows } = await supabase
      .from('session_themes')
      .select('theme_title, created_at')
      .in('session_id', sessionIds)

    const map = new Map<string, { count: number; lastSeen: string }>()
    for (const row of themeRows ?? []) {
      const title = (row as { theme_title: string }).theme_title
      const createdAt = (row as { created_at: string }).created_at
      const existing = map.get(title)
      if (!existing) {
        map.set(title, { count: 1, lastSeen: createdAt })
      } else {
        existing.count++
        if (createdAt > existing.lastSeen) existing.lastSeen = createdAt
      }
    }
    themeFrequency = Array.from(map.entries())
      .map(([themeTitle, { count, lastSeen }]) => ({ themeTitle, count, lastSeen }))
      .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
  }

  // Theme evolution (per session)
  let themeEvolution: PortfolioAnalyticsData['themeEvolution'] = []
  if (sessionIds.length > 0) {
    const { data: allThemes } = await supabase
      .from('session_themes')
      .select('session_id, theme_title')
      .in('session_id', sessionIds)
      .order('theme_number', { ascending: true })

    const themesBySession = new Map<string, string[]>()
    for (const t of allThemes ?? []) {
      const list = themesBySession.get(t.session_id) ?? []
      list.push((t as { theme_title: string }).theme_title)
      themesBySession.set(t.session_id, list)
    }

    themeEvolution = sessions.map(s => ({
      sessionId: s.id,
      speakerName: s.speaker_name,
      createdAt: s.created_at,
      themes: themesBySession.get(s.id) ?? [],
    }))
  }

  // Class insights
  const semesterId = share.config.scope === 'semester' ? share.config.semesterId : undefined
  let insightsQuery = supabase
    .from('class_insights')
    .select('analysis')
    .eq('user_id', share.userId)
  if (semesterId) {
    insightsQuery = insightsQuery.eq('semester_id', semesterId)
  } else {
    insightsQuery = insightsQuery.is('semester_id', null)
  }
  const { data: insightsRow } = await insightsQuery.maybeSingle()
  const classInsights = insightsRow ? (insightsRow.analysis as ClassInsights) : null

  return { themeFrequency, classInsights, themeEvolution }
}

// ─── Roster ─────────────────────────────────────────────────────────────────

export async function getPortfolioRoster(share: PortfolioShare): Promise<StudentSummary[]> {
  if (!share.config.includeStudentProfiles) return []

  const supabase = createAdminClient()

  // Get session IDs in scope
  let sessQuery = supabase.from('sessions').select('id')
  sessQuery = applyScopeFilter(sessQuery, share)
  const { data: sessionRows } = await sessQuery
  const sessionIds = (sessionRows ?? []).map(s => s.id)
  if (sessionIds.length === 0) return []

  const { data: subs } = await supabase
    .from('student_submissions')
    .select('student_name, session_id')
    .in('session_id', sessionIds)

  const map = new Map<string, Set<string>>()
  for (const row of subs ?? []) {
    if (!map.has(row.student_name)) map.set(row.student_name, new Set())
    map.get(row.student_name)!.add(row.session_id)
  }

  return Array.from(map.entries())
    .map(([studentName, sessionSet]) => ({
      studentName,
      sessionCount: sessionSet.size,
      totalSessions: sessionIds.length,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName))
}

// ─── Student detail ─────────────────────────────────────────────────────────

export interface PortfolioStudentDetail {
  studentName: string
  sessionCount: number
  totalSessions: number
  sessions: Array<{
    sessionId: string
    speakerName: string
    createdAt: string
    submissionText: string
  }>
  profile: StudentProfile | null
}

export async function getPortfolioStudentDetail(
  share: PortfolioShare,
  studentName: string
): Promise<PortfolioStudentDetail | null> {
  if (!share.config.includeStudentProfiles) return null

  const supabase = createAdminClient()

  // Session IDs in scope
  let sessQuery = supabase.from('sessions').select('id, speaker_name, created_at')
  sessQuery = applyScopeFilter(sessQuery, share)
  const { data: sessionRows } = await sessQuery.order('created_at', { ascending: false })
  const sessionsInScope = sessionRows ?? []
  const sessionIds = sessionsInScope.map(s => s.id)
  if (sessionIds.length === 0) return null

  // Student submissions
  const { data: subs } = await supabase
    .from('student_submissions')
    .select('session_id, submission_text')
    .eq('student_name', studentName)
    .in('session_id', sessionIds)

  if (!subs || subs.length === 0) return null

  const sessionMap = new Map(sessionsInScope.map(s => [s.id, s]))
  const sessions = subs.map(sub => {
    const sess = sessionMap.get(sub.session_id)
    return {
      sessionId: sub.session_id,
      speakerName: sess?.speaker_name ?? '',
      createdAt: sess?.created_at ?? '',
      submissionText: sub.submission_text,
    }
  })

  // Student profile
  const { data: profileRow } = await supabase
    .from('student_profiles')
    .select('analysis')
    .eq('user_id', share.userId)
    .eq('student_name', studentName)
    .maybeSingle()

  return {
    studentName,
    sessionCount: subs.length,
    totalSessions: sessionIds.length,
    sessions,
    profile: profileRow ? (profileRow.analysis as StudentProfile) : null,
  }
}

// ─── Reports ────────────────────────────────────────────────────────────────

export async function getPortfolioReports(share: PortfolioShare): Promise<SemesterReport[]> {
  if (!share.config.includeReports) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('semester_reports')
    .select('*')
    .eq('user_id', share.userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row: SemesterReportRow) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    config: row.config,
    content: row.content,
    sessionIds: row.session_ids,
    createdAt: row.created_at,
  }))
}

export async function getPortfolioReportById(
  share: PortfolioShare,
  reportId: string
): Promise<SemesterReport | null> {
  if (!share.config.includeReports) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('semester_reports')
    .select('*')
    .eq('id', reportId)
    .eq('user_id', share.userId)
    .maybeSingle()

  if (error || !data) return null

  const row = data as SemesterReportRow
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    config: row.config,
    content: row.content,
    sessionIds: row.session_ids,
    createdAt: row.created_at,
  }
}
