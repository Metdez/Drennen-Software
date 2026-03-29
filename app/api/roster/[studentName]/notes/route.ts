import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import {
  getProfessorNotes,
  addProfessorNote,
  deleteProfessorNote,
  toggleFollowupFlag,
} from '@/lib/db/professorNotes'

export const dynamic = 'force-dynamic'

function decodeStudentName(raw: string): string | null {
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { studentName: string } }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    const text = (body.text ?? '').trim()
    if (!text) return NextResponse.json({ error: 'Note text is required' }, { status: 400 })

    const note = await addProfessorNote(user.id, name, text)
    return NextResponse.json({ note }, { status: 201 })
  } catch (err) {
    console.error('[/api/roster/notes] POST', err)
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 })
  }
}

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
