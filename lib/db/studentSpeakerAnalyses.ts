/**
 * @file lib/db/studentSpeakerAnalyses.ts
 *
 * Student speaker analysis submission data — written essays or structured
 * assessments that students submit after a guest speaker session, plus the
 * AI evaluation that scores and synthesises them.
 *
 * This module is the mirror of `studentDebriefs.ts`.  Where debriefs capture
 * personal reflections, speaker analyses are more structured evaluations of the
 * speaker's content and delivery.  Both feed into student profile generation.
 *
 * Tables touched:
 *   - student_speaker_analysis_submissions  (raw per-student text rows)
 *   - student_speaker_analyses              (AI-generated aggregate evaluation)
 *
 * Called by:
 *   - app/api/sessions/[id]/speaker-analyses/route.ts  (GET, POST)
 *
 * Flow:
 *  1. Professor uploads a ZIP of student analysis files
 *  2. `insertStudentSpeakerAnalysisSubmissions` bulk-inserts one row per student
 *  3. AI runs `lib/ai/speakerAnalysisEvaluation.ts` → result saved via `upsertStudentSpeakerAnalysis`
 *  4. `getStudentSpeakerAnalysesBySession` + `getStudentSpeakerAnalysis` serve the GET
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ParsedSubmission } from '@/lib/parse/builder'
import type { StudentSpeakerAnalysis } from '@/types'

/**
 * Bulk-insert student speaker analysis submissions for a session.
 *
 * Each `ParsedSubmission` maps to one row.  Student name and filename are
 * preserved verbatim from the ZIP parser output.
 *
 * @param sessionId   - UUID of the session these submissions belong to
 * @param submissions - Array of parsed student submissions from `lib/parse/builder`
 * @returns void — no row data needed by the caller
 * @throws {Error} If the batch insert fails
 *
 * Client: createAdminClient() — bypasses RLS
 *         (submissions are ingested by a server-side job with no per-user auth context)
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (POST)
 */
/**
 * Bulk-insert student speaker analysis submissions for a session.
 *
 * Each `ParsedSubmission` maps to one row. Student name and filename are
 * preserved verbatim from the ZIP parser output.
 *
 * @param sessionId   - UUID of the session these submissions belong to
 * @param submissions - Array of parsed student submissions from `lib/parse/builder`
 * @returns void — no row data needed by the caller
 * @throws {Error} If the batch insert fails
 *
 * Client: createAdminClient() — bypasses RLS
 *         (submissions are ingested by a server-side job with no per-user auth context)
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (POST)
 */
export async function insertStudentSpeakerAnalysisSubmissions(
  sessionId: string,
  submissions: ParsedSubmission[]
): Promise<void> {
  // Skip the DB call entirely if there is nothing to insert
  if (submissions.length === 0) return
  const supabase = createAdminClient()
  const rows = submissions.map((s) => ({
    session_id: sessionId,
    student_name: s.studentName,
    filename: s.filename,
    submission_text: s.text,
  }))
  const { error } = await supabase.from('student_speaker_analysis_submissions').insert(rows)
  if (error) throw new Error(`Failed to insert student speaker analysis submissions: ${error.message}`)
}

/**
 * Delete all student speaker analysis submission rows for a session.
 *
 * Called before a fresh upload to keep the table in sync with whatever
 * the professor last uploaded.
 *
 * @param sessionId - UUID of the session whose submissions should be deleted
 * @throws {Error} If the delete fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (POST — before re-insert)
 */
/**
 * Delete all student speaker analysis submission rows for a session.
 *
 * Called before a fresh upload to keep the table in sync with whatever
 * the professor last uploaded.
 *
 * @param sessionId - UUID of the session whose submissions should be deleted
 * @throws {Error} If the delete fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (POST — before re-insert)
 */
export async function deleteStudentSpeakerAnalysisSubmissions(sessionId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_speaker_analysis_submissions')
    .delete()
    .eq('session_id', sessionId)
  if (error) throw new Error(`Failed to delete student speaker analysis submissions: ${error.message}`)
}

/**
 * Retrieve all raw speaker analysis submission rows for a session, ordered
 * by upload time.
 *
 * Returns a plain object array because callers pass this data directly to
 * the AI evaluation agent as raw text.
 *
 * @param sessionId - UUID of the session
 * @returns Array of `{ student_name, submission_text, filename }` objects, oldest first
 * @throws {Error} If the Supabase query fails
 *
 * Client: createClient() — RLS enforced (professor reads only their own sessions' data)
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (GET)
 */
/**
 * Retrieve all raw speaker analysis submission rows for a session, ordered
 * by upload time.
 *
 * Returns a plain object array because callers pass this data directly to
 * the AI evaluation agent as raw text.
 *
 * @param sessionId - UUID of the session
 * @returns Array of `{ student_name, submission_text, filename }` objects, oldest first
 * @throws {Error} If the Supabase query fails
 *
 * Client: createClient() — RLS enforced (professor reads only their own sessions' data)
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (GET)
 */
export async function getStudentSpeakerAnalysesBySession(
  sessionId: string
): Promise<Array<{ student_name: string; submission_text: string; filename: string }>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('student_speaker_analysis_submissions')
    .select('student_name, submission_text, filename')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch student speaker analysis submissions: ${error.message}`)
  return (data ?? []).map((row) => ({
    student_name: row.student_name ?? '',
    submission_text: row.submission_text ?? '',
    filename: row.filename ?? '',
  }))
}

/**
 * Check whether any speaker analysis submissions exist for a session.
 *
 * Uses a `head: true` count query (no row data transferred) for efficiency.
 * Returns `false` silently on error rather than throwing.
 *
 * @param sessionId - UUID of the session
 * @returns `true` if at least one submission row exists, `false` otherwise
 *
 * Client: createClient() — RLS enforced
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (GET — gate for upload prompt)
 */
/**
 * Check whether any speaker analysis submissions exist for a session.
 *
 * Uses a `head: true` count query (no row data transferred) for efficiency.
 * Returns `false` silently on error rather than throwing.
 *
 * @param sessionId - UUID of the session
 * @returns `true` if at least one submission row exists, `false` otherwise
 *
 * Client: createClient() — RLS enforced
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (GET — gate for upload prompt)
 */
export async function hasStudentSpeakerAnalyses(sessionId: string): Promise<boolean> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('student_speaker_analysis_submissions')
    .select('id', { count: 'exact', head: true }) // head:true = COUNT only, no rows returned
    .eq('session_id', sessionId)

  if (error) return false
  return (count ?? 0) > 0
}

/**
 * Insert or replace the AI-generated evaluation of student speaker analyses.
 *
 * Uses upsert on `session_id` so re-running evaluation after a new upload
 * replaces the previous result without creating a duplicate row.
 *
 * @param sessionId - UUID of the session
 * @param userId    - UUID of the owning professor (written for audit trail)
 * @param analysis  - Full `StudentSpeakerAnalysis` payload from the AI agent
 * @param fileCount - Number of student files that were evaluated (stored for display)
 * @throws {Error} If the upsert fails
 *
 * Client: createAdminClient() — bypasses RLS
 *         (evaluation is written by a background AI job with no auth context)
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (POST — after AI run)
 */
/**
 * Insert or replace the AI-generated evaluation of student speaker analyses.
 *
 * Uses upsert on `session_id` so re-running evaluation after a new upload
 * replaces the previous result without creating a duplicate row.
 *
 * @param sessionId - UUID of the session
 * @param userId    - UUID of the owning professor (written for audit trail)
 * @param analysis  - Full `StudentSpeakerAnalysis` payload from the AI agent
 * @param fileCount - Number of student files that were evaluated (stored for display)
 * @throws {Error} If the upsert fails
 *
 * Client: createAdminClient() — bypasses RLS
 *         (evaluation is written by a background AI job with no auth context)
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (POST — after AI run)
 */
export async function upsertStudentSpeakerAnalysis(
  sessionId: string,
  userId: string,
  analysis: StudentSpeakerAnalysis,
  fileCount: number
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_speaker_analyses')
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        // Cast to plain object — Supabase JSONB columns require `Record<string, unknown>`
        analysis: analysis as unknown as Record<string, unknown>,
        file_count: fileCount,
      },
      { onConflict: 'session_id' }
    )
  if (error) throw new Error(`Failed to upsert student speaker analysis: ${error.message}`)
}

/**
 * Retrieve the cached AI evaluation for student speaker analyses.
 * Returns `null` (without throwing) if no evaluation exists yet.
 *
 * @param sessionId - UUID of the session
 * @returns `{ analysis, fileCount }` or `null`
 *
 * Client: createClient() — RLS enforced
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (GET)
 */
/**
 * Retrieve the cached AI evaluation for student speaker analyses.
 * Returns `null` (without throwing) if no evaluation exists yet.
 *
 * @param sessionId - UUID of the session
 * @returns `{ analysis, fileCount }` or `null`
 *
 * Client: createClient() — RLS enforced
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (GET)
 */
export async function getStudentSpeakerAnalysis(
  sessionId: string
): Promise<{ analysis: StudentSpeakerAnalysis; fileCount: number } | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('student_speaker_analyses')
    .select('analysis, file_count')
    .eq('session_id', sessionId)
    .single()

  if (error) return null
  return {
    analysis: data.analysis as StudentSpeakerAnalysis,
    fileCount: data.file_count as number,
  }
}
