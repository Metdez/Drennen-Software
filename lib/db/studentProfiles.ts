/**
 * @file lib/db/studentProfiles.ts
 *
 * Database access layer for AI-generated student growth intelligence profiles.
 *
 * Table: `student_profiles`
 *   - One row per (user_id, student_name) pair — keyed on professor + student.
 *   - The `analysis` column is JSONB and holds the full `StudentProfile` domain object.
 *   - The `growth_signal` column is a denormalized scalar derived from
 *     `analysis.growthIntelligence.overallSignal` for fast roster-level queries.
 *   - The `session_count` column tracks how many sessions were considered when the
 *     profile was last generated.
 *
 * Client: createAdminClient() — bypasses RLS for all operations.
 *   Profiles are written by a fire-and-forget background job (`lib/ai/studentProfile.ts`)
 *   running outside the request/response cycle, so the service-role client is required.
 *   Reads also use admin client because profiles are aggregated across all of a
 *   professor's sessions (no per-request auth cookie is guaranteed to be present).
 *
 * Written by: lib/ai/studentProfile.ts (Gemini, fire-and-forget after session upload)
 * Read by:    app/api/roster/[studentName]/ and app/api/roster/
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { StudentProfile } from '@/types'

/**
 * Fetches the stored AI-generated profile for a single student belonging to a professor.
 *
 * @param userId      - The authenticated professor's user ID (matches `profiles.id`).
 * @param studentName - The canonical student name as stored in `student_submissions.student_name`.
 * @returns The parsed `StudentProfile` object, or `null` if no profile has been generated yet.
 * @throws  If the Supabase query fails for a reason other than "not found".
 *
 * Called by: app/api/roster/[studentName]/profile/route.ts (GET)
 * Table: student_profiles
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Fetches the stored AI-generated profile for a single student belonging to a professor.
 *
 * @param userId - The authenticated professor's user ID (matches `profiles.id`).
 * @param studentName - The canonical student name as stored in `student_submissions.student_name`.
 * @returns The parsed `StudentProfile` object, or `null` if no profile has been generated yet.
 * @throws If the Supabase query fails for a reason other than "not found".
 *
 * Called by: app/api/roster/[studentName]/profile/route.ts (GET)
 * Table: student_profiles
 * Client: createAdminClient() — bypasses RLS
 */
export async function getStudentProfile(userId: string, studentName: string): Promise<StudentProfile | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_profiles')
    .select('analysis')
    .eq('user_id', userId)
    .eq('student_name', studentName)
    .maybeSingle()
  if (error) throw new Error(error.message)
  // `analysis` is stored as opaque JSONB — cast back to the domain type
  return data ? (data.analysis as StudentProfile) : null
}

/**
 * Creates or replaces the AI profile for a student, denormalizing the growth signal
 * scalar alongside the full JSONB blob for efficient roster queries.
 *
 * Uses an upsert on `(user_id, student_name)` so re-running profile generation after
 * new sessions are uploaded always overwrites the previous record.
 *
 * @param userId       - The professor's user ID.
 * @param studentName  - Canonical student name (from `student_submissions.student_name`).
 * @param analysis     - The full `StudentProfile` object produced by the Gemini agent.
 * @param sessionCount - Number of sessions included in this generation run; stored for
 *                       display and to detect stale profiles.
 * @throws If the upsert fails.
 *
 * Called by: lib/ai/studentProfile.ts (fire-and-forget after session upload)
 * Table: student_profiles
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Creates or replaces the AI profile for a student, denormalizing the growth signal
 * scalar alongside the full JSONB blob for efficient roster queries.
 *
 * Uses an upsert on `(user_id, student_name)` so re-running profile generation after
 * new sessions are uploaded always overwrites the previous record.
 *
 * @param userId - The professor's user ID.
 * @param studentName - Canonical student name (from `student_submissions.student_name`).
 * @param analysis - The full `StudentProfile` object produced by the Gemini agent.
 * @param sessionCount - Number of sessions included in this generation run; stored for
 * display and to detect stale profiles.
 * @throws If the upsert fails.
 *
 * Called by: lib/ai/studentProfile.ts (fire-and-forget after session upload)
 * Table: student_profiles
 * Client: createAdminClient() — bypasses RLS
 */
export async function upsertStudentProfile(
  userId: string,
  studentName: string,
  analysis: StudentProfile,
  sessionCount: number
): Promise<void> {
  const supabase = createAdminClient()
  // Denormalize the top-level growth signal so roster queries don't have to
  // deserialize the full JSONB blob for every student
  const growthSignal = analysis.growthIntelligence?.overallSignal ?? null
  const { error } = await supabase.from('student_profiles').upsert(
    {
      user_id: userId,
      student_name: studentName,
      analysis,
      session_count: sessionCount,
      growth_signal: growthSignal,
      updated_at: new Date().toISOString(),
    },
    // Conflict target matches the unique constraint on the table
    { onConflict: 'user_id,student_name' }
  )
  if (error) throw new Error(error.message)
}

/**
 * Returns a map of student_name → growth_signal for the roster display.
 *
 * Fetches only the scalar `growth_signal` column (not the full JSONB profile) for
 * all students who have a non-null signal, making this suitable for decorating large
 * roster lists without deserializing every profile.
 *
 * @param userId - The professor's user ID.
 * @returns A `Map<studentName, growthSignal>` containing only students that have a
 *          non-null signal. Students without a generated profile are absent from the map.
 * @throws  If the Supabase query fails.
 *
 * Called by: app/api/roster/route.ts (GET) — decorates the participation list with signals
 * Table: student_profiles
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Returns a map of student_name → growth_signal for the roster display.
 *
 * Fetches only the scalar `growth_signal` column (not the full JSONB profile) for
 * all students who have a non-null signal, making this suitable for decorating large
 * roster lists without deserializing every profile.
 *
 * @param userId - The professor's user ID.
 * @returns A `Map<studentName, growthSignal>` containing only students that have a
 * non-null signal. Students without a generated profile are absent from the map.
 * @throws If the Supabase query fails.
 *
 * Called by: app/api/roster/route.ts (GET) — decorates the participation list with signals
 * Table: student_profiles
 * Client: createAdminClient() — bypasses RLS
 */
export async function getGrowthSignalsForUser(userId: string): Promise<Map<string, string>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_profiles')
    .select('student_name, growth_signal')
    .eq('user_id', userId)
    // Only fetch rows that have a signal — avoids populating the map with null entries
    .not('growth_signal', 'is', null)

  if (error) throw new Error(error.message)

  const map = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.growth_signal) map.set(row.student_name, row.growth_signal)
  }
  return map
}
