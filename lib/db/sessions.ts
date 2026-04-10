/**
 * @file lib/db/sessions.ts
 *
 * Core session persistence layer. A "session" is the immutable record produced
 * when a professor uploads a Canvas ZIP and the AI pipeline finishes — it holds
 * the speaker name, the AI-generated markdown output, and a file count.
 *
 * Sessions are append-only by design: the `sessions` table has no UPDATE or
 * DELETE RLS policies. Never add mutation queries here.
 *
 * Also contains helpers for inserting student submissions and parsed session
 * themes that are created alongside each new session (called from the same
 * `/api/process` request).
 *
 * Table(s):
 *   - `sessions` (primary)
 *   - `student_submissions` (insertStudentSubmissions)
 *   - `session_themes` (insertSessionThemes)
 *
 * Client:
 *   - insertSession / insertStudentSubmissions / insertSessionThemes:
 *     createAdminClient() — bypasses RLS so the server-side pipeline can write
 *     on behalf of the authenticated professor without needing a cookie context.
 *   - getSessionsByUser / getSessionById:
 *     createClient() — RLS enforced; only the owning professor's rows are
 *     returned.
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Session, SessionSummary, CreateSessionInput, SessionRow } from '@/types'
import { rowToSession, rowToSessionSummary } from '@/lib/utils/transforms'
import type { ParsedSubmission } from '@/lib/parse/builder'
import type { ParsedTheme } from '@/lib/parse/parseThemes'

/**
 * Persists a new session record to the `sessions` table.
 *
 * Called immediately after the AI pipeline completes in `app/api/process`.
 * Uses `createAdminClient()` because the route handler may not have a valid
 * cookie context when inserting (the ZIP upload happens via storage, not the
 * browser cookie flow).
 *
 * @param input - Structured session data including userId, speakerName, AI
 *   output text, file count, and optional semesterId / promptVersionId FKs.
 * @returns The full hydrated `Session` domain object (camelCase) after
 *   insertion.
 * @throws Error if the Supabase insert fails (e.g. constraint violation).
 *
 * Called by: app/api/process/route.ts
 * Table: sessions
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Persists a new session record to the `sessions` table.
 *
 * Called immediately after the AI pipeline completes in `app/api/process`.
 * Uses `createAdminClient()` because the route handler may not have a valid
 * cookie context when inserting (the ZIP upload happens via storage, not the
 * browser cookie flow).
 *
 * @param input - Structured session data including userId, speakerName, AI
 *   output text, file count, and optional semesterId / promptVersionId FKs.
 * @returns The full hydrated `Session` domain object (camelCase) after
 *   insertion.
 * @throws Error if the Supabase insert fails (e.g. constraint violation).
 *
 * Called by: app/api/process/route.ts
 * Table: sessions
 * Client: createAdminClient() — bypasses RLS
 */
export async function insertSession(input: CreateSessionInput): Promise<Session> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: input.userId,
      speaker_name: input.speakerName,
      output: input.output,
      file_count: input.fileCount,
      // Optional FK to semesters — NULL means the session is unassigned
      semester_id: input.semesterId ?? null,
      // NULL = built-in default prompt was used; non-null = a saved custom version
      prompt_version_id: input.promptVersionId ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to insert session: ${error.message}`)
  return rowToSession(data as SessionRow)
}

/**
 * Lists session summaries for a professor, optionally filtered to a specific
 * semester. Returns lightweight objects (no AI output text) suitable for
 * history lists and analytics.
 *
 * @param userId - The authenticated professor's user ID.
 * @param semesterId - Optional semester UUID to scope results.
 * @returns Array of `SessionSummary` objects sorted newest-first.
 * @throws Error if the query fails.
 *
 * Called by: app/api/sessions/route.ts
 * Table: sessions
 * Client: createClient() — RLS enforced (professor sees only their own rows)
 */
/**
 * Lists session summaries for a professor, optionally filtered to a specific
 * semester. Returns lightweight objects (no AI output text) suitable for
 * history lists and analytics.
 *
 * @param userId - The authenticated professor's user ID.
 * @param semesterId - Optional semester UUID to scope results.
 * @returns Array of `SessionSummary` objects sorted newest-first.
 * @throws Error if the query fails.
 *
 * Called by: app/api/sessions/route.ts
 * Table: sessions
 * Client: createClient() — RLS enforced (professor sees only their own rows)
 */
export async function getSessionsByUser(userId: string, semesterId?: string): Promise<SessionSummary[]> {
  const supabase = createClient()
  // Select only the columns needed for list views — avoids pulling large `output` text
  let query = supabase
    .from('sessions')
    .select('id, speaker_name, created_at, file_count, semester_id')
    .eq('user_id', userId)
  if (semesterId) query = query.eq('semester_id', semesterId)
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`)
  return (data as SessionRow[]).map(rowToSessionSummary)
}

/**
 * Fetches a single session by its UUID, including the full AI output text.
 *
 * Returns `null` (rather than throwing) when the session doesn't exist or the
 * RLS policy denies access — this allows callers to return a 404 cleanly
 * without catching an exception.
 *
 * @param id - The session UUID.
 * @returns The full `Session` domain object, or `null` if not found / access
 *   denied.
 *
 * Called by: app/api/sessions/[id]/route.ts, and many sub-routes that need
 *   the session's output or metadata (e.g. download, analysis, debrief).
 * Table: sessions
 * Client: createClient() — RLS enforced
 */
/**
 * Fetches a single session by its UUID, including the full AI output text.
 *
 * Returns `null` (rather than throwing) when the session doesn't exist or the
 * RLS policy denies access — this allows callers to return a 404 cleanly
 * without catching an exception.
 *
 * @param id - The session UUID.
 * @returns The full `Session` domain object, or `null` if not found / access
 *   denied.
 *
 * Called by: app/api/sessions/[id]/route.ts, and many sub-routes that need
 *   the session's output or metadata (e.g. download, analysis, debrief).
 * Table: sessions
 * Client: createClient() — RLS enforced
 */
export async function getSessionById(id: string): Promise<Session | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  // Return null on any error (including PGRST116 "0 rows" from .single())
  if (error) return null
  return rowToSession(data as SessionRow)
}

/**
 * Bulk-inserts student submission rows for a session.
 *
 * Each row stores the raw submission text and the student name derived from
 * the ZIP filename (`FirstName_LastName...`). This data powers the roster,
 * student profiles, analytics leaderboard, and debrief features.
 *
 * @param sessionId - The parent session UUID (FK).
 * @param submissions - Array of parsed submissions from `lib/parse/builder.ts`.
 * @returns void — throws if the insert fails.
 *
 * Called by: app/api/process/route.ts (after insertSession)
 * Table: student_submissions
 * Client: createAdminClient() — bypasses RLS (server-side pipeline write)
 */
/**
 * Bulk-inserts student submission rows for a session.
 *
 * Each row stores the raw submission text and the student name derived from
 * the ZIP filename (`FirstName_LastName...`). This data powers the roster,
 * student profiles, analytics leaderboard, and debrief features.
 *
 * @param sessionId - The parent session UUID (FK).
 * @param submissions - Array of parsed submissions from `lib/parse/builder.ts`.
 * @returns void — throws if the insert fails.
 *
 * Called by: app/api/process/route.ts (after insertSession)
 * Table: student_submissions
 * Client: createAdminClient() — bypasses RLS (server-side pipeline write)
 */
export async function insertStudentSubmissions(
  sessionId: string,
  submissions: ParsedSubmission[]
): Promise<void> {
  if (submissions.length === 0) return
  const supabase = createAdminClient()
  const rows = submissions.map((s) => ({
    session_id: sessionId,
    student_name: s.studentName,
    filename: s.filename,
    submission_text: s.text,
  }))
  const { error } = await supabase.from('student_submissions').insert(rows)
  if (error) throw new Error(`Failed to insert student submissions: ${error.message}`)
}

/**
 * Bulk-inserts theme rows parsed from the AI output for a session.
 *
 * Themes are used by the analytics theme-frequency view, the theme deep-dive
 * pages, and class insights generation. Each row captures the theme's ordinal
 * position (`theme_number`) and its title as extracted by
 * `lib/parse/parseThemes.ts`.
 *
 * @param sessionId - The parent session UUID (FK).
 * @param themes - Array of parsed themes (number + title pairs).
 * @returns void — throws if the insert fails.
 *
 * Called by: app/api/process/route.ts (after insertSession)
 * Table: session_themes
 * Client: createAdminClient() — bypasses RLS (server-side pipeline write)
 */
/**
 * Bulk-inserts theme rows parsed from the AI output for a session.
 *
 * Themes are used by the analytics theme-frequency view, the theme deep-dive
 * pages, and class insights generation. Each row captures the theme's ordinal
 * position (`theme_number`) and its title as extracted by
 * `lib/parse/parseThemes.ts`.
 *
 * @param sessionId - The parent session UUID (FK).
 * @param themes - Array of parsed themes (number + title pairs).
 * @returns void — throws if the insert fails.
 *
 * Called by: app/api/process/route.ts (after insertSession)
 * Table: session_themes
 * Client: createAdminClient() — bypasses RLS (server-side pipeline write)
 */
export async function insertSessionThemes(
  sessionId: string,
  themes: ParsedTheme[]
): Promise<void> {
  if (themes.length === 0) return
  const supabase = createAdminClient()
  const rows = themes.map((t) => ({
    session_id: sessionId,
    theme_number: t.themeNumber,
    theme_title: t.themeTitle,
  }))
  const { error } = await supabase.from('session_themes').insert(rows)
  if (error) throw new Error(`Failed to insert session themes: ${error.message}`)
}
