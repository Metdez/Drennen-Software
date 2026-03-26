import { createAdminClient } from '@/lib/supabase/server'
import type { ClassInsights, ThemeEvolutionEntry } from '@/types'

export async function getClassInsights(userId: string): Promise<ClassInsights | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('class_insights')
    .select('analysis')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? (data.analysis as ClassInsights) : null
}

export async function upsertClassInsights(
  userId: string,
  analysis: ClassInsights,
  sessionCount: number
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('class_insights').upsert(
    { user_id: userId, analysis, session_count: sessionCount, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(error.message)
}

export interface InsightsInput {
  sessions: Array<{
    sessionId: string
    speakerName: string
    date: string
    submissionCount: number
    themes: string[]
  }>
  leaderboard: Array<{ studentName: string; submissionCount: number }>
  dropoff: Array<{ studentName: string; lastSeenSpeaker: string }>
}

export async function fetchInsightsInput(userId: string): Promise<InsightsInput> {
  const supabase = createAdminClient()

  // Sessions oldest-first
  const { data: sessionRows, error: sessErr } = await supabase
    .from('sessions')
    .select('id, speaker_name, created_at, file_count')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
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

  // Group themes by session
  const themesBySession = new Map<string, string[]>()
  for (const t of themeRows ?? []) {
    const list = themesBySession.get(t.session_id) ?? []
    list.push(t.theme_title)
    themesBySession.set(t.session_id, list)
  }

  const sessions: InsightsInput['sessions'] = rows.map(s => ({
    sessionId: s.id,
    speakerName: s.speaker_name,
    date: s.created_at,
    submissionCount: s.file_count,
    themes: themesBySession.get(s.id) ?? [],
  }))

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

  // Students missing from recent sessions (potential dropoff)
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
