/**
 * @file lib/db/professorNotes.ts
 *
 * Database access layer for professor-authored notes on individual students.
 *
 * Table: `professor_student_notes`
 *   - One row per note. A student can have many notes from the same professor.
 *   - Each note has an optional `flagged_for_followup` boolean for surface-level triage.
 *   - Notes are intentionally separate from AI-generated profiles (`student_profiles`):
 *     they persist even when profiles are regenerated, preserving human observations.
 *
 * Client: createAdminClient() — bypasses RLS for all operations.
 *   The note mutation endpoints authenticate the professor at the API-route level
 *   (via Supabase cookie auth), then pass the resolved `userId` down here. Using the
 *   admin client avoids the overhead of forwarding cookies through server actions while
 *   still scoping every query to `user_id`.
 *
 * Called by: app/api/roster/[studentName]/notes/route.ts (GET, POST, DELETE)
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { ProfessorNote } from '@/types'

/**
 * Retrieves all notes a professor has written for a specific student, newest first.
 *
 * @param userId      - The authenticated professor's user ID.
 * @param studentName - The canonical student name (matches `student_submissions.student_name`).
 * @returns Array of `ProfessorNote` domain objects in descending creation order.
 * @throws  If the Supabase query fails.
 *
 * Called by: app/api/roster/[studentName]/notes/route.ts (GET)
 * Table: professor_student_notes
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Retrieves all notes a professor has written for a specific student, newest first.
 *
 * @param userId      - The authenticated professor's user ID.
 * @param studentName - The canonical student name (matches `student_submissions.student_name`).
 * @returns Array of `ProfessorNote` domain objects in descending creation order.
 * @throws  If the Supabase query fails.
 *
 * Called by: app/api/roster/[studentName]/notes/route.ts (GET)
 * Table: professor_student_notes
 * Client: createAdminClient() — bypasses RLS
 */
export async function getProfessorNotes(userId: string, studentName: string): Promise<ProfessorNote[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('professor_student_notes')
    .select('id, student_name, note_text, flagged_for_followup, created_at')
    .eq('user_id', userId)
    .eq('student_name', studentName)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Map snake_case DB columns to camelCase domain type
  return (data ?? []).map((row) => ({
    id: row.id,
    studentName: row.student_name,
    noteText: row.note_text,
    flaggedForFollowup: row.flagged_for_followup,
    createdAt: row.created_at,
  }))
}

/**
 * Inserts a new note for a student. New notes are unflagged by default (DB default).
 *
 * @param userId      - The authenticated professor's user ID.
 * @param studentName - The canonical student name.
 * @param text        - The note body text.
 * @returns The newly created `ProfessorNote` with its generated `id` and `created_at`.
 * @throws  If the insert fails.
 *
 * Called by: app/api/roster/[studentName]/notes/route.ts (POST)
 * Table: professor_student_notes
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Inserts a new note for a student. New notes are unflagged by default (DB default).
 *
 * @param userId      - The authenticated professor's user ID.
 * @param studentName - The canonical student name.
 * @param text        - The note body text.
 * @returns The newly created `ProfessorNote` with its generated `id` and `created_at`.
 * @throws  If the insert fails.
 *
 * Called by: app/api/roster/[studentName]/notes/route.ts (POST)
 * Table: professor_student_notes
 * Client: createAdminClient() — bypasses RLS
 */
export async function addProfessorNote(
  userId: string,
  studentName: string,
  text: string
): Promise<ProfessorNote> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('professor_student_notes')
    .insert({ user_id: userId, student_name: studentName, note_text: text })
    .select('id, student_name, note_text, flagged_for_followup, created_at')
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    studentName: data.student_name,
    noteText: data.note_text,
    flaggedForFollowup: data.flagged_for_followup,
    createdAt: data.created_at,
  }
}

/**
 * Hard-deletes a note by ID. The `user_id` filter ensures professors can only
 * delete their own notes even though the admin client bypasses RLS.
 *
 * @param noteId - The UUID of the note to delete.
 * @param userId - The authenticated professor's user ID (ownership guard).
 * @throws  If the delete fails.
 *
 * Called by: app/api/roster/[studentName]/notes/route.ts (DELETE)
 * Table: professor_student_notes
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Hard-deletes a note by ID. The `user_id` filter ensures professors can only
 * delete their own notes even though the admin client bypasses RLS.
 *
 * @param noteId - The UUID of the note to delete.
 * @param userId - The authenticated professor's user ID (ownership guard).
 * @throws  If the delete fails.
 *
 * Called by: app/api/roster/[studentName]/notes/route.ts (DELETE)
 * Table: professor_student_notes
 * Client: createAdminClient() — bypasses RLS
 */
export async function deleteProfessorNote(noteId: string, userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('professor_student_notes')
    .delete()
    .eq('id', noteId)
    // Ownership guard: prevents a professor from deleting another professor's note
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

/**
 * Toggles the `flagged_for_followup` boolean on a note using a read-then-write pattern.
 *
 * A read-then-write is used rather than a SQL `NOT flagged_for_followup` expression
 * because the Supabase PostgREST API does not support column-referencing expressions
 * in UPDATE payloads. The two round-trips are acceptable given low concurrency on notes.
 *
 * @param noteId - The UUID of the note to toggle.
 * @param userId - The authenticated professor's user ID (ownership guard on both queries).
 * @returns The new flag value after the toggle.
 * @throws  If either the read or the write fails.
 *
 * Called by: app/api/roster/[studentName]/notes/route.ts (PATCH)
 * Table: professor_student_notes
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Toggles the `flagged_for_followup` boolean on a note using a read-then-write pattern.
 *
 * A read-then-write is used rather than a SQL `NOT flagged_for_followup` expression
 * because the Supabase PostgREST API does not support column-referencing expressions
 * in UPDATE payloads. The two round-trips are acceptable given low concurrency on notes.
 *
 * @param noteId - The UUID of the note to toggle.
 * @param userId - The authenticated professor's user ID (ownership guard on both queries).
 * @returns The new flag value after the toggle.
 * @throws  If either the read or the write fails.
 *
 * Called by: app/api/roster/[studentName]/notes/route.ts (PATCH)
 * Table: professor_student_notes
 * Client: createAdminClient() — bypasses RLS
 */
export async function toggleFollowupFlag(noteId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient()

  // Step 1: read the current flag value
  const { data: current, error: readErr } = await supabase
    .from('professor_student_notes')
    .select('flagged_for_followup')
    .eq('id', noteId)
    .eq('user_id', userId)
    .single()

  if (readErr) throw new Error(readErr.message)

  const newValue = !current.flagged_for_followup

  // Step 2: write the negated value
  const { error: updateErr } = await supabase
    .from('professor_student_notes')
    .update({ flagged_for_followup: newValue })
    .eq('id', noteId)
    .eq('user_id', userId)

  if (updateErr) throw new Error(updateErr.message)

  return newValue
}

/**
 * Returns student names that have at least one note flagged for follow-up.
 *
 * Used by the roster page to display a follow-up indicator badge next to student
 * names without fetching all notes for every student. Returns a `Set` for O(1)
 * membership checks when decorating large rosters.
 *
 * @param userId - The authenticated professor's user ID.
 * @returns A `Set<studentName>` of all students with at least one flagged note.
 * @throws  If the Supabase query fails.
 *
 * Called by: app/api/roster/route.ts (GET) — decorates the roster list with flag indicators
 * Table: professor_student_notes
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Returns student names that have at least one note flagged for follow-up.
 *
 * Used by the roster page to display a follow-up indicator badge next to student
 * names without fetching all notes for every student. Returns a `Set` for O(1)
 * membership checks when decorating large rosters.
 *
 * @param userId - The authenticated professor's user ID.
 * @returns A `Set<studentName>` of all students with at least one flagged note.
 * @throws  If the Supabase query fails.
 *
 * Called by: app/api/roster/route.ts (GET) — decorates the roster list with flag indicators
 * Table: professor_student_notes
 * Client: createAdminClient() — bypasses RLS
 */
export async function getStudentsWithFollowupFlags(userId: string): Promise<Set<string>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('professor_student_notes')
    .select('student_name')
    .eq('user_id', userId)
    .eq('flagged_for_followup', true)

  if (error) throw new Error(error.message)

  return new Set((data ?? []).map((row) => row.student_name))
}
