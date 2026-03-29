import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSemesterById } from '@/lib/db/semesters'
import { generateSemesterStory } from '@/lib/ai/storyAgent'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { semesterId?: string }

    if (!body.semesterId) {
      return NextResponse.json({ error: 'Missing semesterId' }, { status: 400 })
    }

    const semester = await getSemesterById(body.semesterId)
    if (!semester || semester.userId !== user.id) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    const { storyId, title, sections } = await generateSemesterStory(
      user.id,
      semester.id,
      semester.name,
    )

    return NextResponse.json({ storyId, title, sections })
  } catch (err) {
    console.error('[/api/stories/generate]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
