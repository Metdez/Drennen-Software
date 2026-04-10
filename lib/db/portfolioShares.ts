/**
 * @file lib/db/portfolioShares.ts
 *
 * Database access layer for portfolio share tokens and configurable public portfolio data.
 *
 * A portfolio share gives an external audience (e.g. an accreditation reviewer or
 * department chair) token-gated read-only access to a professor's data. Professors
 * control which sections are visible via a `PortfolioConfig` object, and may scope
 * the portfolio to a single semester or expose all sessions.
 *
 * Table: `portfolio_shares`
 *   Key columns: `user_id` (1:1 with professor), `share_token` (UUID public URL key),
 *   `enabled` (visibility toggle), `config` (JSONB — `PortfolioConfig`).
 *
 * This file also contains the public data-fetching functions for all portfolio
 * sections (landing page, sessions list, session detail, analytics, roster, student
 * detail, reports). All public functions use `createAdminClient()` because there is
 * no auth cookie present in the public route context (`(public)/portfolio/[token]/`).
 *
 * Mixed client usage:
 *   - `getPortfolioShare()` uses `createClient()` (RLS enforced) — called when the
 *     authenticated professor views their share settings page.
 *   - All write operations and token-validated public data functions use
 *     `createAdminClient()` — writes need service role; public reads have no auth cookie.
 *
 * Scope filtering: `applyScopeFilter()` is a private helper that narrows session queries
 * to the portfolio owner's userId and, when `config.scope === 'semester'`, further limits
 * results to a specific semester. All public data functions go through this helper.
 *
 * Called by:
 *   - app/api/portfolio/route.ts                              (GET, POST)
 *   - app/api/portfolio/[token]/route.ts                      (GET — getPortfolioByToken)
 *   - app/api/portfolio/[token]/analytics/route.ts            (GET — getPortfolioAnalytics)
 *   - app/api/portfolio/[token]/reports/route.ts              (GET — getPortfolioReports)
 *   - app/api/portfolio/[token]/reports/[reportId]/route.ts   (GET — getPortfolioReportById)
 *   - app/api/portfolio/[token]/roster/route.ts               (GET — getPortfolioRoster)
 *   - app/api/portfolio/[token]/roster/[studentName]/route.ts (GET — getPortfolioStudentDetail)
 *   - app/api/portfolio/[token]/sessions/route.ts             (GET — getPortfolioSessions)
 *   - app/api/portfolio/[token]/sessions/[sessionId]/route.ts (GET — getPortfolioSessionDetail)
 */

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

/**
 * Builds a minimal `SessionSummary` from a partial session row (only the columns
 * selected in portfolio queries — `user_id` and `output` are intentionally omitted
 * for efficiency and to avoid exposing raw AI output in list views).
 * `debriefStatus` and `debriefRating` are always `null` in the portfolio context —
 * debrief data is private and not exposed publicly.
 */
/**
 * Builds a minimal `SessionSummary` from a partial session row (only the columns
 * selected in portfolio queries — `user_id` and `output` are intentionally omitted
 * for efficiency and to avoid exposing raw AI output in list views).
 * `debriefStatus` and `debriefRating` are always `null` in the portfolio context —
 * debrief data is private and not exposed publicly.
 */
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

/**
 * Transforms a `PortfolioShareRow` database object into a `PortfolioShare` application object.
 *
 * It is used to convert raw data fetched from the `portfolio_shares` table into a more usable,
 * type-safe format for the application, ensuring that default configuration values are merged.
 *
 * Merges `DEFAULT_PORTFOLIO_CONFIG` with any custom configuration stored in the `config` column
 * to provide a complete and consistent `PortfolioConfig` structure.
 */
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

/**
 * Fetch the professor's portfolio share record (authenticated context).
 *
 * Returns `null` silently on error or if the professor has never enabled sharing,
 * so the settings page can show an "enable sharing" CTA without throwing.
 *
 * @param userId - The authenticated professor's user ID.
 * @returns `PortfolioShare` with merged `DEFAULT_PORTFOLIO_CONFIG`, or `null`.
 *
 * Client: createClient() — RLS enforced
 * Called by: app/api/portfolio/route.ts (GET)
 */
/**
 * Fetch the professor's portfolio share record (authenticated context).
 *
 * Returns `null` silently on error or if the professor has never enabled sharing,
 * so the settings page can show an "enable sharing" CTA without throwing.
 *
 * @param userId - The authenticated professor's user ID.
 * @returns `PortfolioShare` with merged `DEFAULT_PORTFOLIO_CONFIG`, or `null`.
 *
 * Client: createClient() — RLS enforced
 * Called by: app/api/portfolio/route.ts (GET)
 */
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

/**
 * Create or update the portfolio share row for a professor.
 *
 * Uses upsert on `user_id` (unique constraint) so calling this a second time with
 * updated config replaces the previous settings without creating a duplicate row.
 * Also resets `enabled = true` on every call so saving new config simultaneously
 * enables the share.
 *
 * @param userId - The professor's user ID.
 * @param config - `PortfolioConfig` controlling section visibility and scope.
 * @returns The saved `PortfolioShare` with the current (or newly generated) token.
 * @throws  If the upsert fails.
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/portfolio/route.ts (POST)
 */
/**
 * Create or update the portfolio share row for a professor.
 *
 * Uses upsert on `user_id` (unique constraint) so calling this a second time with
 * updated config replaces the previous settings without creating a duplicate row.
 * Also resets `enabled = true` on every call so saving new config simultaneously
 * enables the share.
 *
 * @param userId - The professor's user ID.
 * @param config - `PortfolioConfig` controlling section visibility and scope.
 * @returns The saved `PortfolioShare` with the current (or newly generated) token.
 * @throws  If the upsert fails.
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/portfolio/route.ts (POST)
 */
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

/**
 * Toggle the portfolio share on or off.
 *
 * Sets `enabled` without changing the `share_token`, so the URL is preserved
 * and re-enabling restores access to the same link that was previously shared.
 *
 * @param userId  - The professor's user ID.
 * @param enabled - `true` to make the portfolio publicly accessible, `false` to hide it.
 * @throws  If the update fails.
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/portfolio/route.ts (POST — toggle action)
 */
/**
 * Toggle the portfolio share on or off.
 *
 * Sets `enabled` without changing the `share_token`, so the URL is preserved
 * and re-enabling restores access to the same link that was previously shared.
 *
 * @param userId  - The professor's user ID.
 * @param enabled - `true` to make the portfolio publicly accessible, `false` to hide it.
 * @throws  If the update fails.
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/portfolio/route.ts (POST — toggle action)
 */
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

/**
 * Generate a new `share_token` for the professor's portfolio, invalidating the old link.
 *
 * Calls the `gen_random_uuid` Postgres function via Supabase RPC to produce the
 * new token, then writes it back to the row. Any previously distributed links
 * stop working immediately after this call.
 *
 * @param userId - The professor's user ID.
 * @returns The updated `PortfolioShare` with the new token.
 * @throws  If the RPC or the subsequent update fails.
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/portfolio/route.ts (POST — regenerate action)
 */
/**
 * Generate a new `share_token` for the professor's portfolio, invalidating the old link.
 *
 * Calls the `gen_random_uuid` Postgres function via Supabase RPC to produce the
 * new token, then writes it back to the row. Any previously distributed links
 * stop working immediately after this call.
 *
 * @param userId - The professor's user ID.
 * @returns The updated `PortfolioShare` with the new token.
 * @throws  If the RPC or the subsequent update fails.
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/portfolio/route.ts (POST — regenerate action)
 */
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

/**
 * Validate a portfolio share token and return the share configuration if active.
 *
 * The `enabled = true` filter means disabled portfolios return `null` — the
 * public route treats this as a 404 so visitors don't see a meaningful error.
 *
 * @param token - UUID share token from the public URL (`/portfolio/[token]`).
 * @returns `PortfolioShare` (with merged defaults in `config`) or `null` if
 *          the token is invalid or the portfolio is disabled.
 *
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/route.ts (GET — token validation entry point)
 */
/**
 * Validate a portfolio share token and return the share configuration if active.
 *
 * The `enabled = true` filter means disabled portfolios return `null` — the
 * public route treats this as a 404 so visitors don't see a meaningful error.
 *
 * @param token - UUID share token from the public URL (`/portfolio/[token]`).
 * @returns `PortfolioShare` (with merged defaults in `config`) or `null` if
 *           the token is invalid or the portfolio is disabled.
 *
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/route.ts (GET — token validation entry point)
 */
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

/**
 * Applies ownership and semester-scope filters to a Supabase session query.
 *
 * Every public data function calls this helper to ensure results are limited to:
 *   1. Sessions owned by `share.userId` (ownership check).
 *   2. When `config.scope === 'semester'` and `config.semesterId` is set, only
 *      sessions assigned to that semester (semester scope).
 *
 * @param query - Mutable Supabase query builder (typed as `any` for flexibility
 *                across different `.select()` column sets).
 * @param share - The validated `PortfolioShare` whose config drives the filter.
 * @returns The modified query builder with filters applied.
 */
/**
 * Applies ownership and semester-scope filters to a Supabase session query.
 *
 * Every public data function calls this helper to ensure results are limited to:
 *   1. Sessions owned by `share.userId` (ownership check).
 *   2. When `config.scope === 'semester'` and `config.semesterId` is set, only
 *      sessions assigned to that semester (semester scope).
 *
 * @param query - Mutable Supabase query builder (typed as `any` for flexibility
 *                 across different `.select()` column sets).
 * @param share - The validated `PortfolioShare` whose config drives the filter.
 * @returns The modified query builder with filters applied.
 */
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

/**
 * Defines the structure for the data required to render the public portfolio landing page.
 *
 * It is used to aggregate various summary statistics and lists of resources that are displayed
 * on the main portfolio view, allowing the UI to render conditionally based on available data
 * and professor's sharing configurations.
 *
 * Includes summaries of semesters and sessions, total student and submission counts, date ranges,
 * and flags indicating which content sections (sessions, analytics, roster, reports) are available
 * and should be linked to in the navigation.
 */
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

/**
 * Builds the landing page payload for a public portfolio.
 *
 * Aggregates data across multiple tables to populate the portfolio home page:
 *   - All semesters for the professor (for the semester navigation).
 *   - Session list (scope-filtered via `applyScopeFilter()`).
 *   - Total unique student count and total submission count across scoped sessions.
 *   - Date range (earliest and latest session creation dates).
 *   - Section availability flags (`sessions`, `analytics`, `roster`, `reports`).
 *
 * The `sections` object tells the UI which nav links to show. `roster` is hidden
 * when `includeStudentProfiles = false` in the config or when no students exist.
 * `reports` is hidden when `includeReports = false` or when no report rows exist.
 *
 * @param share - The validated `PortfolioShare` (from `getPortfolioByToken()`).
 * @returns `PortfolioLandingData` with all landing page fields.
 *
 * Tables: semesters, sessions, student_submissions, semester_reports
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/route.ts (GET — landing page data)
 */
/**
 * Builds the landing page payload for a public portfolio.
 *
 * Aggregates data across multiple tables to populate the portfolio home page:
 *   - All semesters for the professor (for the semester navigation).
 *   - Session list (scope-filtered via `applyScopeFilter()`).
 *   - Total unique student count and total submission count across scoped sessions.
 *   - Date range (earliest and latest session creation dates).
 *   - Section availability flags (`sessions`, `analytics`, `roster`, `reports`).
 *
 * The `sections` object tells the UI which nav links to show. `roster` is hidden
 * when `includeStudentProfiles = false` in the config or when no students exist.
 * `reports` is hidden when `includeReports = false` or when no report rows exist.
 *
 * @param share - The validated `PortfolioShare` (from `getPortfolioByToken()`).
 * @returns `PortfolioLandingData` with all landing page fields.
 *
 * Tables: semesters, sessions, student_submissions, semester_reports
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/route.ts (GET — landing page data)
 */
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

/**
 * Returns the list of sessions visible in the portfolio, optionally filtered to a specific semester.
 *
 * `semesterId` parameter overrides the share's scope config — this allows the sessions
 * page to drill into a specific semester even if the portfolio is scoped to all sessions.
 * When no `semesterId` is given, `applyScopeFilter()` is responsible for the semester constraint.
 *
 * Returns an empty array (silently) on query error so the public page degrades gracefully.
 *
 * @param share      - The validated `PortfolioShare`.
 * @param semesterId - Optional semester UUID to filter sessions further.
 * @returns Array of `SessionSummary` objects sorted newest-first.
 *
 * Table: sessions
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/sessions/route.ts (GET)
 */
/**
 * Returns the list of sessions visible in the portfolio, optionally filtered to a specific semester.
 *
 * `semesterId` parameter overrides the share's scope config — this allows the sessions
 * page to drill into a specific semester even if the portfolio is scoped to all sessions.
 * When no `semesterId` is given, `applyScopeFilter()` is responsible for the semester constraint.
 *
 * Returns an empty array (silently) on query error so the public page degrades gracefully.
 *
 * @param share      - The validated `PortfolioShare`.
 * @param semesterId - Optional semester UUID to filter sessions further.
 * @returns Array of `SessionSummary` objects sorted newest-first.
 *
 * Table: sessions
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/sessions/route.ts (GET)
 */
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

/**
 * Defines the comprehensive data structure for a single session when viewed in a public portfolio.
 *
 * It is used to provide all necessary information for a detailed session page, including the core
 * session data, associated themes, AI analysis, debriefing summary (if available and not private),
 * and the speaker brief content.
 *
 * The `brief` field prioritizes edited content from the professor, ensuring the public sees the refined version.
 */
export interface PortfolioSessionDetail {
  session: Session
  themes: string[]
  analysis: SessionAnalysis | null
  debrief: { aiSummary: string | null; overallRating: number | null; status: string } | null
  brief: SpeakerBriefContent | null
}

/**
 * Fetches full session detail for the portfolio session viewer.
 *
 * Enforces scope before returning data: if the session belongs to a different user
 * or is outside the semester scope, `null` is returned. All ancillary data is fetched
 * in parallel via `Promise.all()` to minimise latency.
 *
 * The `brief` field prefers `edited_content` over the original AI `content` so
 * portfolio viewers see the professor's refined version.
 *
 * @param share     - The validated `PortfolioShare`.
 * @param sessionId - UUID of the session to fetch.
 * @returns `PortfolioSessionDetail` or `null` if the session is outside scope.
 *
 * Tables: sessions, session_themes, session_analyses, session_debriefs, speaker_briefs
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/sessions/[sessionId]/route.ts (GET)
 */
/**
 * Fetches full session detail for the portfolio session viewer.
 *
 * Enforces scope before returning data: if the session belongs to a different user
 * or is outside the semester scope, `null` is returned. All ancillary data is fetched
 * in parallel via `Promise.all()` to minimise latency.
 *
 * The `brief` field prefers `edited_content` over the original AI `content` so
 * portfolio viewers see the professor's refined version.
 *
 * @param share     - The validated `PortfolioShare`.
 * @param sessionId - UUID of the session to fetch.
 * @returns `PortfolioSessionDetail` or `null` if the session is outside scope.
 *
 * Tables: sessions, session_themes, session_analyses, session_debriefs, speaker_briefs
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/sessions/[sessionId]/route.ts (GET)
 */
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

/**
 * Defines the structure for various analytics data points displayed on the public portfolio's analytics page.
 *
 * It is used to present aggregated insights to portfolio visitors, including frequency of themes,
 * the chronological evolution of themes across sessions, and AI-generated class insights.
 *
 * This structure combines data from multiple database tables to provide a holistic view of speaking trends and class dynamics.
 */
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

/**
 * Computes analytics data for the portfolio analytics page.
 *
 * Produces three data sets:
 *   1. `themeFrequency` — aggregate theme occurrence count across all scoped sessions,
 *      computed in the application layer (same approach as `lib/db/themes.ts`).
 *   2. `themeEvolution` — per-session theme lists ordered chronologically, used for
 *      the evolution chart (how themes shifted from speaker to speaker over time).
 *   3. `classInsights` — cached Gemini class analysis for the professor, scoped to
 *      the active semester if applicable (`semester_id IS NULL` = all-time insights).
 *
 * @param share - The validated `PortfolioShare`.
 * @returns `PortfolioAnalyticsData` with all three data sets.
 *
 * Tables: sessions, session_themes, class_insights
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/analytics/route.ts (GET)
 */
/**
 * Computes analytics data for the portfolio analytics page.
 *
 * Produces three data sets:
 *   1. `themeFrequency` — aggregate theme occurrence count across all scoped sessions,
 *      computed in the application layer (same approach as `lib/db/themes.ts`).
 *   2. `themeEvolution` — per-session theme lists ordered chronologically, used for
 *      the evolution chart (how themes shifted from speaker to speaker over time).
 *   3. `classInsights` — cached Gemini class analysis for the professor, scoped to
 *      the active semester if applicable (`semester_id IS NULL` = all-time insights).
 *
 * @param share - The validated `PortfolioShare`.
 * @returns `PortfolioAnalyticsData` with all three data sets.
 *
 * Tables: sessions, session_themes, class_insights
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/analytics/route.ts (GET)
 */
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

/**
 * Returns a sorted roster of students visible in the portfolio.
 *
 * Guards on `includeStudentProfiles` so this function is a no-op (returns `[]`)
 * when the professor has disabled roster exposure in their share settings.
 *
 * Counts are computed using a `Set<sessionId>` per student so a student appearing
 * in 3 of 5 sessions is shown as "3/5" rather than having their submission count
 * inflated by multiple files per session.
 *
 * @param share - The validated `PortfolioShare`.
 * @returns Array of `StudentSummary` objects sorted alphabetically by student name.
 *          Returns `[]` if `includeStudentProfiles = false` or no students exist.
 *
 * Tables: sessions, student_submissions
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/roster/route.ts (GET)
 */
/**
 * Returns a sorted roster of students visible in the portfolio.
 *
 * Guards on `includeStudentProfiles` so this function is a no-op (returns `[]`)
 * when the professor has disabled roster exposure in their share settings.
 *
 * Counts are computed using a `Set<sessionId>` per student so a student appearing
 * in 3 of 5 sessions is shown as "3/5" rather than having their submission count
 * inflated by multiple files per session.
 *
 * @param share - The validated `PortfolioShare`.
 * @returns Array of `StudentSummary` objects sorted alphabetically by student name.
 *           Returns `[]` if `includeStudentProfiles = false` or no students exist.
 *
 * Tables: sessions, student_submissions
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/roster/route.ts (GET)
 */
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

/**
 * Defines the detailed information for a single student within the portfolio's scope.
 *
 * It is used to display a student's speaking engagements and submission details within the
 * context of the shared portfolio, along with their AI-generated growth profile if available.
 *
 * Includes the student's name, their participation count, a list of their sessions with submission text,
 * and their `StudentProfile` if generated.
 */
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

/**
 * Returns full detail for a single student within the portfolio scope.
 *
 * Returns `null` in two cases:
 *   1. `includeStudentProfiles = false` in the share config.
 *   2. The student has no submissions within the scoped sessions.
 *
 * The `profile` field contains the AI growth-intelligence profile from `student_profiles`,
 * or `null` if the profile has not been generated yet. Profiles are fire-and-forget
 * background jobs and may not exist immediately after upload.
 *
 * @param share       - The validated `PortfolioShare`.
 * @param studentName - The student's display name (e.g. "Jane S.").
 * @returns `PortfolioStudentDetail` or `null`.
 *
 * Tables: sessions, student_submissions, student_profiles
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/roster/[studentName]/route.ts (GET)
 */
/**
 * Returns full detail for a single student within the portfolio scope.
 *
 * Returns `null` in two cases:
 *   1. `includeStudentProfiles = false` in the share config.
 *   2. The student has no submissions within the scoped sessions.
 *
 * The `profile` field contains the AI growth-intelligence profile from `student_profiles`,
 * or `null` if the profile has not been generated yet. Profiles are fire-and-forget
 * background jobs and may not exist immediately after upload.
 *
 * @param share       - The validated `PortfolioShare`.
 * @param studentName - The student's display name (e.g. "Jane S.").
 * @returns `PortfolioStudentDetail` or `null`.
 *
 * Tables: sessions, student_submissions, student_profiles
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/roster/[studentName]/route.ts (GET)
 */
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

/**
 * Returns all semester reports visible in the portfolio.
 *
 * Returns `[]` when `includeReports = false` in the share config, acting as a
 * fast exit before hitting the database. Reports are not scope-filtered by semester
 * because they are professor-level artifacts that span multiple sessions.
 *
 * @param share - The validated `PortfolioShare`.
 * @returns Array of `SemesterReport` objects sorted newest-first, or `[]` if disabled.
 *
 * Table: semester_reports
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/reports/route.ts (GET)
 */
/**
 * Returns all semester reports visible in the portfolio.
 *
 * Returns `[]` when `includeReports = false` in the share config, acting as a
 * fast exit before hitting the database. Reports are not scope-filtered by semester
 * because they are professor-level artifacts that span multiple sessions.
 *
 * @param share - The validated `PortfolioShare`.
 * @returns Array of `SemesterReport` objects sorted newest-first, or `[]` if disabled.
 *
 * Table: semester_reports
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/reports/route.ts (GET)
 */
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

/**
 * Fetches a single semester report for the portfolio report detail page.
 *
 * Filters by both `id` and `user_id` to prevent cross-portfolio token reuse
 * (a visitor holding one portfolio token cannot retrieve another professor's report).
 * Returns `null` when `includeReports = false` or the report is not found.
 *
 * @param share    - The validated `PortfolioShare`.
 * @param reportId - UUID of the `semester_reports` row to fetch.
 * @returns `SemesterReport` or `null` if disabled / not found.
 *
 * Table: semester_reports
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/reports/[reportId]/route.ts (GET)
 */
/**
 * Fetches a single semester report for the portfolio report detail page.
 *
 * Filters by both `id` and `user_id` to prevent cross-portfolio token reuse
 * (a visitor holding one portfolio token cannot retrieve another professor's report).
 * Returns `null` when `includeReports = false` or the report is not found.
 *
 * @param share    - The validated `PortfolioShare`.
 * @param reportId - UUID of the `semester_reports` row to fetch.
 * @returns `SemesterReport` or `null` if disabled / not found.
 *
 * Table: semester_reports
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Called by: app/api/portfolio/[token]/reports/[reportId]/route.ts (GET)
 */
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
