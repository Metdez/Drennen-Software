import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Session, SessionSummary, CreateSessionInput, SessionRow } from '@/types'
import { rowToSession, rowToSessionSummary } from '@/lib/utils/transforms'
import type { ParsedSubmission } from '@/lib/parse/builder'
import type { ParsedTheme } from '@/lib/parse/parseThemes'

export async function insertSession(input: CreateSessionInput): Promise<Session> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: input.userId,
      speaker_name: input.speakerName,
      output: input.output,
      file_count: input.fileCount,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to insert session: ${error.message}`)
  return rowToSession(data as SessionRow)
}

export async function getSessionsByUser(userId: string): Promise<SessionSummary[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, speaker_name, created_at, file_count')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`)
  return (data as SessionRow[]).map(rowToSessionSummary)
}

export async function getSessionById(id: string): Promise<Session | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return rowToSession(data as SessionRow)
}

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
