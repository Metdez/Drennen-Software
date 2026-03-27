import { createClient } from '@/lib/supabase/server'
import type { AnalyticsData, SessionAnalyticsRow, LeaderboardEntry, DropoffEntry } from '@/types'

export async function getAnalytics(userId: string, semesterId?: string): Promise<AnalyticsData> {
  const supabase = createClient()

  // Sessions oldest-first for chronological charts
  let sessQuery = supabase
    .from('sessions')
    .select('id, speaker_name, created_at, file_count')
    .eq('user_id', userId)
  if (semesterId) sessQuery = sessQuery.eq('semester_id', semesterId)
  const { data: sessionRows, error: sessErr } = await sessQuery.order('created_at', { ascending: true })
  if (sessErr) throw new Error(sessErr.message)

  const sessionIds = (sessionRows ?? []).map(s => s.id)

  // Student submissions for this user's sessions
  const { data: studentRows, error: stuErr } = sessionIds.length
    ? await supabase
        .from('student_submissions')
        .select('session_id, student_name')
        .in('session_id', sessionIds)
    : { data: [], error: null }
  if (stuErr) throw new Error(stuErr.message)

  // --- sessions with relative rate ---
  const studentsBySession = new Map<string, string[]>()
  for (const row of studentRows ?? []) {
    const list = studentsBySession.get(row.session_id) ?? []
    list.push(row.student_name)
    studentsBySession.set(row.session_id, list)
  }

  const maxCount = Math.max(1, ...(sessionRows ?? []).map(s => s.file_count))

  const sessions: SessionAnalyticsRow[] = (sessionRows ?? []).map(s => ({
    sessionId: s.id,
    speakerName: s.speaker_name,
    date: s.created_at,
    submissionCount: s.file_count,
    hasStudentData: studentsBySession.has(s.id),
    relativeSubmissionRate: Math.round((s.file_count / maxCount) * 100),
  }))

  // --- leaderboard (top 10) ---
  const countByStudent = new Map<string, number>()
  for (const row of studentRows ?? []) {
    countByStudent.set(row.student_name, (countByStudent.get(row.student_name) ?? 0) + 1)
  }
  const leaderboard: LeaderboardEntry[] = Array.from(countByStudent.entries())
    .map(([studentName, submissionCount]) => ({ studentName, submissionCount }))
    .sort((a, b) => b.submissionCount - a.submissionCount)
    .slice(0, 10)

  // --- drop-off ---
  // Definition: appeared in earliest 60% of sessions-with-data, absent from most recent 33%
  // Requires >= 3 sessions with student data to produce meaningful results
  const sessionsWithStudents = sessions.filter(s => s.hasStudentData)
  let dropoff: DropoffEntry[] = []

  if (sessionsWithStudents.length >= 3) {
    const cutEarly = Math.ceil(sessionsWithStudents.length * 0.6)
    const cutRecent = Math.floor(sessionsWithStudents.length * 0.67)
    // Sessions between cutEarly and cutRecent are a neutral middle zone —
    // neither counted as early nor recent, intentionally excluded from both buckets
    const earlySessionIds = new Set(sessionsWithStudents.slice(0, cutEarly).map(s => s.sessionId))
    const recentSessionIds = new Set(sessionsWithStudents.slice(cutRecent).map(s => s.sessionId))

    const earlyStudents = new Map<string, number>()
    const recentStudents = new Set<string>()
    const lastSeenMap = new Map<string, { speaker: string; date: string }>()

    for (const row of studentRows ?? []) {
      if (earlySessionIds.has(row.session_id)) {
        earlyStudents.set(row.student_name, (earlyStudents.get(row.student_name) ?? 0) + 1)
      }
      if (recentSessionIds.has(row.session_id)) {
        recentStudents.add(row.student_name)
      }
      const sess = sessions.find(s => s.sessionId === row.session_id)
      if (sess) {
        const existing = lastSeenMap.get(row.student_name)
        if (!existing || sess.date > existing.date) {
          lastSeenMap.set(row.student_name, { speaker: sess.speakerName, date: sess.date })
        }
      }
    }

    dropoff = Array.from(earlyStudents.entries())
      .filter(([name]) => !recentStudents.has(name))
      .map(([studentName, earlySessionCount]) => {
        const last = lastSeenMap.get(studentName)
        return {
          studentName,
          lastSeenSpeaker: last?.speaker ?? 'Unknown',
          lastSeenDate: last?.date ?? '',
          earlySessionCount,
        }
      })
      .sort((a, b) => b.earlySessionCount - a.earlySessionCount)
  }

  const uniqueStudents = new Set((studentRows ?? []).map(r => r.student_name))
  const ratesWithData = sessions.filter(s => s.hasStudentData).map(s => s.relativeSubmissionRate)
  const avgRelativeRate = ratesWithData.length
    ? Math.round(ratesWithData.reduce((a, b) => a + b, 0) / ratesWithData.length)
    : 0

  return {
    sessions,
    leaderboard,
    dropoff,
    meta: {
      totalSessions: sessions.length,
      totalUniqueStudents: uniqueStudents.size,
      hasAnyStudentData: (studentRows ?? []).length > 0,
      avgRelativeRate,
    },
  }
}
