import { createAdminClient } from '@/lib/supabase/server'
import type {
  CohortComparisonData,
  SemesterComparisonStats,
  ThemePersistence,
} from '@/types/comparison'

export async function getSemesterComparisonData(
  userId: string,
  semesterIds: string[]
): Promise<CohortComparisonData> {
  const supabase = createAdminClient()

  const semesters: SemesterComparisonStats[] = []
  // Track themes per semester for persistence calculation
  const themesBySemester = new Map<string, Map<string, number>>()

  for (const semesterId of semesterIds) {
    // Get sessions for this semester
    const { data: sessionRows, error: sessErr } = await supabase
      .from('sessions')
      .select('id, file_count')
      .eq('user_id', userId)
      .eq('semester_id', semesterId)
    if (sessErr) throw new Error(sessErr.message)

    const sessions = sessionRows ?? []
    const sessionIds = sessions.map(s => s.id)
    const sessionCount = sessions.length

    // Count unique students
    let studentCount = 0
    if (sessionIds.length > 0) {
      const { data: studentRows, error: stuErr } = await supabase
        .from('student_submissions')
        .select('student_name')
        .in('session_id', sessionIds)
      if (stuErr) throw new Error(stuErr.message)

      const uniqueStudents = new Set((studentRows ?? []).map(r => r.student_name))
      studentCount = uniqueStudents.size
    }

    // Calculate average submissions per session (avg file_count)
    const avgSubmissions =
      sessions.length > 0
        ? Math.round(
            (sessions.reduce((sum, s) => sum + (s.file_count ?? 0), 0) / sessions.length) * 10
          ) / 10
        : 0

    // Get top themes (from session_themes joined through sessions, aggregate by count, top 5)
    let topThemes: string[] = []
    const semThemeMap = new Map<string, number>()
    if (sessionIds.length > 0) {
      const { data: themeRows, error: themeErr } = await supabase
        .from('session_themes')
        .select('theme_title')
        .in('session_id', sessionIds)
      if (themeErr) throw new Error(themeErr.message)

      for (const t of themeRows ?? []) {
        semThemeMap.set(t.theme_title, (semThemeMap.get(t.theme_title) ?? 0) + 1)
      }

      topThemes = Array.from(semThemeMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([title]) => title)
    }

    themesBySemester.set(semesterId, semThemeMap)

    // Get semester name
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

  // Build theme persistence: for each unique theme across all semesters,
  // track which semesters it appears in and total occurrences
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

  const themePersistence: ThemePersistence[] = Array.from(allThemes.entries())
    .map(([theme, data]) => ({
      theme,
      semesterIds: data.semesterIds,
      totalOccurrences: data.totalOccurrences,
    }))
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences)

  return { semesters, themePersistence }
}
