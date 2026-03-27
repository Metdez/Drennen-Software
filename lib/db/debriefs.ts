import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { SessionDebrief, SessionDebriefRow, UpsertDebriefInput, DebriefStatus } from '@/types'
import { rowToDebrief } from '@/lib/utils/transforms'

/** Get debrief for a session (authenticated context — uses RLS) */
export async function getDebrief(sessionId: string): Promise<SessionDebrief | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('session_debriefs')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error) return null
  return data ? rowToDebrief(data as SessionDebriefRow) : null
}

/** Create or update a debrief (admin context — bypasses RLS) */
export async function upsertDebrief(input: UpsertDebriefInput): Promise<SessionDebrief> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('session_debriefs')
    .upsert(
      {
        session_id: input.sessionId,
        user_id: input.userId,
        overall_rating: input.overallRating ?? null,
        questions_feedback: input.questionsFeedback ?? [],
        surprise_moments: input.surpriseMoments ?? '',
        speaker_feedback: input.speakerFeedback ?? '',
        student_observations: input.studentObservations ?? [],
        followup_topics: input.followupTopics ?? '',
        private_notes: input.privateNotes ?? '',
        status: input.status ?? 'draft',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert debrief: ${error.message}`)
  return rowToDebrief(data as SessionDebriefRow)
}

/** Mark debrief as complete and store the AI summary */
export async function completeDebrief(sessionId: string, aiSummary: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('session_debriefs')
    .update({
      status: 'complete',
      ai_summary: aiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)

  if (error) throw new Error(`Failed to complete debrief: ${error.message}`)
}

export interface DebriefStatusInfo {
  status: DebriefStatus
  overallRating: number | null
}

/** Batch lookup debrief statuses (with rating) for a list of session IDs */
export async function getDebriefStatusesBySessionIds(
  sessionIds: string[]
): Promise<Map<string, DebriefStatusInfo>> {
  if (sessionIds.length === 0) return new Map()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('session_debriefs')
    .select('session_id, status, overall_rating')
    .in('session_id', sessionIds)

  if (error || !data) return new Map()

  const map = new Map<string, DebriefStatusInfo>()
  for (const row of data) {
    map.set(row.session_id, {
      status: row.status as DebriefStatus,
      overallRating: row.overall_rating ?? null,
    })
  }
  return map
}

/** Get student names for a session (for debrief observations autocomplete) */
export async function getStudentNamesForSession(sessionId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_submissions')
    .select('student_name')
    .eq('session_id', sessionId)

  if (error || !data) return []
  return [...new Set(data.map((r: { student_name: string }) => r.student_name))].sort()
}
