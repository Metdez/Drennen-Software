import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { SemesterStory, SemesterStoryRow, StorySection } from '@/types'

function rowToStory(row: SemesterStoryRow): SemesterStory {
  return {
    id: row.id,
    userId: row.user_id,
    semesterId: row.semester_id,
    title: row.title,
    sections: row.sections,
    sessionIds: row.session_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Upsert a semester story (one per semester). Uses admin context. */
export async function upsertStory(
  userId: string,
  semesterId: string,
  title: string,
  sections: StorySection[],
  sessionIds: string[]
): Promise<SemesterStory> {
  const supabase = createAdminClient()

  // Check for existing story on this semester (unique index)
  const { data: existing } = await supabase
    .from('semester_stories')
    .select('id')
    .eq('semester_id', semesterId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('semester_stories')
      .update({
        title,
        sections,
        session_ids: sessionIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update story: ${error.message}`)
    return rowToStory(data as SemesterStoryRow)
  }

  const { data, error } = await supabase
    .from('semester_stories')
    .insert({
      user_id: userId,
      semester_id: semesterId,
      title,
      sections,
      session_ids: sessionIds,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to insert story: ${error.message}`)
  return rowToStory(data as SemesterStoryRow)
}

/** Get a story by ID (RLS-protected) */
export async function getStoryById(id: string): Promise<SemesterStory | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('semester_stories')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return rowToStory(data as SemesterStoryRow)
}

/** Get a story by semester ID (RLS-protected) */
export async function getStoryBySemesterId(semesterId: string): Promise<SemesterStory | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('semester_stories')
    .select('*')
    .eq('semester_id', semesterId)
    .maybeSingle()

  if (error || !data) return null
  return rowToStory(data as SemesterStoryRow)
}

/** Update story sections after editing. Uses admin context. */
export async function updateStorySections(
  id: string,
  sections: StorySection[]
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('semester_stories')
    .update({ sections, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Failed to update story sections: ${error.message}`)
}
