import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import {
  getProfessorNotes,
  addProfessorNote,
  deleteProfessorNote,
  toggleFollowupFlag,
} from '@/lib/db/professorNotes'

export const dynamic = 'force-dynamic'

/**
 * Safely percent-decodes a URL path segment that represents a student name.
 * Returns `null` if the value is malformed (prevents `decodeURIComponent` throwing).
 */
function decodeStudentName(raw: string): string | null {
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

/**
 * GET /api/roster/[studentName]/notes
 *
 * Retrieves all professor-authored notes for a specific student.
 *
 * @param _request - Not used; student name comes from the route segment.
 * @param params.studentName - URL-encoded student name (e.g. `"John%20Doe"`).
 * @returns `{ notes: ProfessorNote[] }` — array of note records ordered by creation
 *   date. Empty array when the professor has no notes for this student.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Notes are scoped to the authenticated professor via `user.id`; professors
 *     cannot access each other's notes.
 *   - Notes survive AI profile regeneration — they are never overwritten by AI.
 * @see {@link lib/db/professorNotes.ts} — `getProfessorNotes()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { studentName: string } }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Decode percent-encoded student name from the URL path segment
  const name = decodeStudentName(params.studentName)
  if (!name) return NextResponse.json({ error: 'Invalid student name' }, { status: 400 })

  try {
    const notes = await getProfessorNotes(user.id, name)
    return NextResponse.json({ notes })
  } catch (err) {
    console.error('[/api/roster/notes] GET', err)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

/**
 * POST /api/roster/[studentName]/notes
 *
 * Creates a new professor note for a specific student.
 *
 * @param request - JSON body: `{ text: string }` — the note content (required,
 *   non-empty after trimming).
 * @param params.studentName - URL-encoded student name.
 * @returns `{ note: ProfessorNote }` with status 201 on success.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Empty or whitespace-only `text` returns 400.
 *   - Notes are stored in the `professor_student_notes` table, keyed by
 *     `(professor_id, student_name)`.
 * @see {@link lib/db/professorNotes.ts} — `addProfessorNote()`
 */
export async function POST(
  request: Request,
  { params }: { params: { studentName: string } }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const name = decodeStudentName(params.studentName)
  if (!name) return NextResponse.json({ error: 'Invalid student name' }, { status: 400 })

  try {
    const body = await request.json()
    // Trim whitespace before validating so blank submissions are caught early
    const text = (body.text ?? '').trim()
    if (!text) return NextResponse.json({ error: 'Note text is required' }, { status: 400 })

    const note = await addProfessorNote(user.id, name, text)
    return NextResponse.json({ note }, { status: 201 })
  } catch (err) {
    console.error('[/api/roster/notes] POST', err)
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 })
  }
}

/**
 * DELETE /api/roster/[studentName]/notes
 *
 * Permanently deletes a professor note by its ID.
 *
 * @param request - JSON body: `{ noteId: string }` — the UUID of the note to delete.
 * @param params.studentName - URL-encoded student name (included for route consistency;
 *   ownership is verified via `user.id` inside `deleteProfessorNote`, not by name).
 * @returns `{ ok: true }` on success.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - `deleteProfessorNote` verifies that the note belongs to the requesting professor
 *     before deleting — prevents cross-professor deletion.
 *   - Missing `noteId` returns 400.
 * @see {@link lib/db/professorNotes.ts} — `deleteProfessorNote()`
 */
export async function DELETE(
  request: Request,
  { params }: { params: { studentName: string } }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // studentName not strictly needed for delete, but we keep it for route consistency
  const name = decodeStudentName(params.studentName)
  if (!name) return NextResponse.json({ error: 'Invalid student name' }, { status: 400 })

  try {
    const body = await request.json()
    const noteId = body.noteId
    if (!noteId) return NextResponse.json({ error: 'noteId is required' }, { status: 400 })

    await deleteProfessorNote(noteId, user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/roster/notes] DELETE', err)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}

/**
 * PATCH /api/roster/[studentName]/notes
 *
 * Toggles the `flaggedForFollowup` boolean on a specific professor note.
 *
 * @param request - JSON body: `{ noteId: string }` — the UUID of the note to toggle.
 * @param params.studentName - URL-encoded student name.
 * @returns `{ flaggedForFollowup: boolean }` — the new flag value after toggling.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - The toggle is atomic in `toggleFollowupFlag` — it reads and flips the current
 *     value in a single DB round-trip.
 *   - Flagged students appear in the follow-up panel on the roster page and are
 *     surfaced via `getStudentsWithFollowupFlags()` in `GET /api/roster`.
 * @see {@link lib/db/professorNotes.ts} — `toggleFollowupFlag()`
 */
export async function PATCH(
  request: Request,
  { params }: { params: { studentName: string } }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const name = decodeStudentName(params.studentName)
  if (!name) return NextResponse.json({ error: 'Invalid student name' }, { status: 400 })

  try {
    const body = await request.json()
    const noteId = body.noteId
    if (!noteId) return NextResponse.json({ error: 'noteId is required' }, { status: 400 })

    const newValue = await toggleFollowupFlag(noteId, user.id)
    return NextResponse.json({ flaggedForFollowup: newValue })
  } catch (err) {
    console.error('[/api/roster/notes] PATCH', err)
    return NextResponse.json({ error: 'Failed to toggle flag' }, { status: 500 })
  }
}
