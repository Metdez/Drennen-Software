/**
 * @file lib/db/semesterComparison.ts
 *
 * Database access layer for cross-semester cohort comparison data.
 *
 * This module aggregates data from multiple tables across a set of semesters to
 * produce a side-by-side statistical comparison used by the analytics compare view.
 *
 * Tables touched (read-only):
 *   - `sessions`            — session count and `file_count` per semester
 *   - `student_submissions` — unique student headcount per semester
 *   - `session_themes`      — theme frequency per semester
 *   - `semesters`           — semester display names
 *
 * Client: createAdminClient() — bypasses RLS for all queries.
 *   This function is called from an API route that has already validated the requesting
 *   professor's identity. The multi-table aggregation spans sessions and submissions that
 *   may be owned by different RLS policies, so the admin client is used for consistency.
 *
 * Written by AI: lib/ai/semesterComparison.ts (Gemini) consumes the output of this
 *   function to produce a narrative comparison analysis.
 *
 * Called by: app/api/semesters/compare/route.ts (GET)
 *            app/api/analytics/compare/route.ts (GET)
 */

import { createAdminClient } from '@/lib/supabase/server'
import type {
  CohortComparisonData,
  SemesterComparisonStats,
  ThemePersistence,
} from '@/types/comparison'

/**
 * Builds a full cross-semester cohort comparison dataset for a list of semesters.
 *
 * For each semester in `semesterIds` the function computes:
 *   - `sessionCount`    — total number of sessions in the semester
 *   - `studentCount`    — unique students across all sessions (via student_submissions)
 *   - `avgSubmissions`  — mean `file_count` per session, rounded to one decimal place
 *   - `topThemes`       — top 5 theme titles by occurrence frequency across the semester
 *
 * After building per-semester stats, the function performs a second pass to compute
 * `themePersistence`: for every unique theme title that appears in any semester, it
 * tracks which semesters it appeared in and the total occurrence count. Themes that
 * recur across multiple semesters rise to the top of the list (sorted by
 * `totalOccurrences` descending), revealing curriculum-level patterns.
 *
 * Implementation notes:
 *   - Queries are issued in a serial loop (one set of queries per semester) rather
 *     than in parallel. This keeps the logic simple and avoids overwhelming Postgres
 *     with concurrent queries when comparing many semesters. Performance is acceptable
 *     because this is a background/on-demand analytics query, not a hot path.
 *   - `avgSubmissions` uses `file_count` as a proxy for student submission count per
 *     session (each file in the ZIP = one student submission). Rounded to 1 decimal.
 *   - Theme deduplication for `topThemes` is case-sensitive — theme titles must match
 *     exactly to be counted together. Normalisation is handled upstream at parse time.
 *
 * @param userId      - The authenticated professor's user ID; scopes all session queries.
 * @param semesterIds - Ordered array of semester UUIDs to compare. The result `semesters`
 *                      array preserves this order.
 * @returns `CohortComparisonData` containing:
 *   - `semesters`:       Per-semester stats array (same order as input IDs).
 *   - `themePersistence`: All unique themes ranked by total occurrences across semesters.
 * @throws  If any Supabase query fails (missing semester rows are tolerated — name falls
 *          back to the raw ID string).
 *
 * Called by: app/api/semesters/compare/route.ts (GET)
 *            app/api/analytics/compare/route.ts (GET)
 * Tables: sessions, student_submissions, session_themes, semesters
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Builds a full cross-semester cohort comparison dataset for a list of semesters.
 *
 * For each semester in `semesterIds` the function computes:
 *   - `sessionCount`    — total number of sessions in the semester
 *   - `studentCount`    — unique students across all sessions (via student_submissions)
 *   - `avgSubmissions`  — mean `file_count` per session, rounded to one decimal place
 *   - `topThemes`       — top 5 theme titles by occurrence frequency across the semester
 *
 * After building per-semester stats, the function performs a second pass to compute
 * `themePersistence`: for every unique theme title that appears in any semester, it
 * tracks which semesters it appeared in and the total occurrence count. Themes that
 * recur across multiple semesters rise to the top of the list (sorted by
 * `totalOccurrences` descending), revealing curriculum-level patterns.
 *
 * Implementation notes:
 *   - Queries are issued in a serial loop (one set of queries per semester) rather
 *     than in parallel. This keeps the logic simple and avoids overwhelming Postgres
 *     with concurrent queries when comparing many semesters. Performance is acceptable
 *     because this is a background/on-demand analytics query, not a hot path.
 *   - `avgSubmissions` uses `file_count` as a proxy for student submission count per
 *     session (each file in the ZIP = one student submission). Rounded to 1 decimal.
 *   - Theme deduplication for `topThemes` is case-sensitive — theme titles must match
 *     exactly to be counted together. Normalisation is handled upstream at parse time.
 *
 * @param userId      - The authenticated professor's user ID; scopes all session queries.
 * @param semesterIds - Ordered array of semester UUIDs to compare. The result `semesters`
 *                       array preserves this order.
 * @returns `CohortComparisonData` containing:
 *   - `semesters`:       Per-semester stats array (same order as input IDs).
 *   - `themePersistence`: All unique themes ranked by total occurrences across semesters.
 * @throws  If any Supabase query fails (missing semester rows are tolerated — name falls
 *           back to the raw ID string).
 *
 * Called by: app/api/semesters/compare/route.ts (GET)
 *             app/api/analytics/compare/route.ts (GET)
 * Tables: sessions, student_submissions, session_themes, semesters
 * Client: createAdminClient() — bypasses RLS
 */
export async function getSemesterComparisonData(
  userId: string,
  semesterIds: string[]
): Promise<CohortComparisonData> {
  const supabase = createAdminClient()

  const semesters: SemesterComparisonStats[] = []
  // Accumulate theme maps per semester so we can calculate cross-semester persistence
  // after all individual semester stats are built
  const themesBySemester = new Map<string, Map<string, number>>()

  for (const semesterId of semesterIds) {
    // ── 1. Sessions ──────────────────────────────────────────────────────────────
    // Fetch only the fields we need (id for joining, file_count for avg calculation)
    const { data: sessionRows, error: sessErr } = await supabase
      .from('sessions')
      .select('id, file_count')
      .eq('user_id', userId)
      .eq('semester_id', semesterId)
    if (sessErr) throw new Error(sessErr.message)

    const sessions = sessionRows ?? []
    const sessionIds = sessions.map(s => s.id)
    const sessionCount = sessions.length

    // ── 2. Unique students ────────────────────────────────────────────────────────
    // Count distinct student names across all sessions in this semester.
    // Skipped entirely when the semester has no sessions to avoid an empty IN() clause.
    let studentCount = 0
    if (sessionIds.length > 0) {
      const { data: studentRows, error: stuErr } = await supabase
        .from('student_submissions')
        .select('student_name')
        .in('session_id', sessionIds)
      if (stuErr) throw new Error(stuErr.message)

      // Use a Set to deduplicate — a student appearing in multiple sessions counts once
      const uniqueStudents = new Set((studentRows ?? []).map(r => r.student_name))
      studentCount = uniqueStudents.size
    }

    // ── 3. Average submissions per session ────────────────────────────────────────
    // `file_count` represents the number of student files in the ZIP for that session,
    // which is a reliable proxy for the number of students who submitted that week.
    const avgSubmissions =
      sessions.length > 0
        ? Math.round(
            (sessions.reduce((sum, s) => sum + (s.file_count ?? 0), 0) / sessions.length) * 10
          ) / 10
        : 0

    // ── 4. Top themes ─────────────────────────────────────────────────────────────
    // Aggregate theme_title occurrences across all session_themes rows for this semester,
    // then take the top 5 by frequency.
    let topThemes: string[] = []
    const semThemeMap = new Map<string, number>()
    if (sessionIds.length > 0) {
      const { data: themeRows, error: themeErr } = await supabase
        .from('session_themes')
        .select('theme_title')
        .in('session_id', sessionIds)
      if (themeErr) throw new Error(themeErr.message)

      // Count occurrences of each theme title within this semester
      for (const t of themeRows ?? []) {
        semThemeMap.set(t.theme_title, (semThemeMap.get(t.theme_title) ?? 0) + 1)
      }

      topThemes = Array.from(semThemeMap.entries())
        .sort((a, b) => b[1] - a[1]) // descending by count
        .slice(0, 5)
        .map(([title]) => title)
    }

    // Store this semester's full theme map for the cross-semester persistence pass below
    themesBySemester.set(semesterId, semThemeMap)

    // ── 5. Semester display name ──────────────────────────────────────────────────
    // Fall back to the raw UUID if the semesters row is unexpectedly missing
    const { data: semRow } = await supabase
      .from('semesters')
      .select('name')
      .eq('id', semesterId)
      .single()

    semesters.push({
      id: semesterId,
      name: semRow?.name ?? semesterId,
      sessionCount,
      studentCount,
      avgSubmissions,
      topThemes,
    })
  }

  // ── 6. Theme persistence (cross-semester) ─────────────────────────────────────
  // For each unique theme title across all semesters, record which semesters it
  // appeared in and the cumulative occurrence count. A theme that shows up in every
  // semester indicates a persistent curriculum concern or student interest area.
  const allThemes = new Map<string, { semesterIds: string[]; totalOccurrences: number }>()

  for (const [semesterId, themeMap] of themesBySemester) {
    for (const [theme, count] of themeMap) {
      const existing = allThemes.get(theme)
      if (existing) {
        existing.semesterIds.push(semesterId)
        existing.totalOccurrences += count
      } else {
        allThemes.set(theme, { semesterIds: [semesterId], totalOccurrences: count })
      }
    }
  }

  // Sort by totalOccurrences descending so the most persistent themes surface first
  const themePersistence: ThemePersistence[] = Array.from(allThemes.entries())
    .map(([theme, data]) => ({
      theme,
      semesterIds: data.semesterIds,
      totalOccurrences: data.totalOccurrences,
    }))
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences)

  return { semesters, themePersistence }
}
