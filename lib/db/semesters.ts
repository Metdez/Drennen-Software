import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Semester, SemesterRow, SemesterSummary, CreateSemesterInput, UpdateSemesterInput, SessionSummary } from '@/types'
import { rowToSessionSummary } from '@/lib/utils/transforms'
import type { SessionRow } from '@/types'

function rowToSemester(row: SemesterRow): Semester {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
  }
}

export async function getSemestersByUser(userId: string): Promise<SemesterSummary[]> {
  const supabase = createClient()

  const { data: semesters, error: semErr } = await supabase
    .from('semesters')
    .select('id, name, start_date, end_date, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (semErr) throw new Error(`Failed to fetch semesters: ${semErr.message}`)
  if (!semesters || semesters.length === 0) return []

  const semesterIds = semesters.map(s => s.id)

  // Count sessions per semester
  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select('id, semester_id')
    .in('semester_id', semesterIds)

  if (sessErr) throw new Error(`Failed to count sessions: ${sessErr.message}`)

  const countMap = new Map<string, number>()
  for (const s of sessions ?? []) {
    countMap.set(s.semester_id, (countMap.get(s.semester_id) ?? 0) + 1)
  }

  // Fetch story IDs for each semester
  const { data: stories } = await supabase
    .from('semester_stories')
    .select('id, semester_id')
    .in('semester_id', semesterIds)

  const storyMap = new Map<string, string>()
  for (const s of stories ?? []) {
    storyMap.set(s.semester_id, s.id)
  }

  return semesters.map(s => ({
    id: s.id,
    name: s.name,
    status: s.status as 'active' | 'archived',
    sessionCount: countMap.get(s.id) ?? 0,
    startDate: s.start_date,
    endDate: s.end_date,
    storyId: storyMap.get(s.id) ?? null,
  }))
}

export async function getActiveSemester(userId: string): Promise<Semester | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch active semester: ${error.message}`)
  return data ? rowToSemester(data as SemesterRow) : null
}

export async function getSemesterById(id: string): Promise<Semester | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return rowToSemester(data as SemesterRow)
}

export async function insertSemester(input: CreateSemesterInput): Promise<Semester> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('semesters')
    .insert({
      user_id: input.userId,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      status: 'active',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create semester: ${error.message}`)
  return rowToSemester(data as SemesterRow)
}

export async function updateSemester(id: string, input: UpdateSemesterInput): Promise<Semester> {
  const supabase = createAdminClient()
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.startDate !== undefined) updates.start_date = input.startDate
  if (input.endDate !== undefined) updates.end_date = input.endDate
  if (input.status !== undefined) updates.status = input.status

  const { data, error } = await supabase
    .from('semesters')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update semester: ${error.message}`)
  return rowToSemester(data as SemesterRow)
}

export async function archiveAndCreateSemester(
  userId: string,
  newSemester: CreateSemesterInput
): Promise<Semester> {
  const supabase = createAdminClient()

  // Archive current active semester if one exists
  const active = await getActiveSemester(userId)
  if (active) {
    const { error: archiveErr } = await supabase
      .from('semesters')
      .update({ status: 'archived' })
      .eq('id', active.id)
    if (archiveErr) throw new Error(`Failed to archive semester: ${archiveErr.message}`)
  }

  return insertSemester(newSemester)
}

export async function assignSessionsToSemester(
  sessionIds: string[],
  semesterId: string
): Promise<void> {
  if (sessionIds.length === 0) return
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sessions')
    .update({ semester_id: semesterId })
    .in('id', sessionIds)
  if (error) throw new Error(`Failed to assign sessions: ${error.message}`)
}

export async function getUnassignedSessions(userId: string): Promise<SessionSummary[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, speaker_name, created_at, file_count, semester_id')
    .eq('user_id', userId)
    .is('semester_id', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch unassigned sessions: ${error.message}`)
  return (data as SessionRow[]).map(rowToSessionSummary)
}
