import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getStoryById, updateStorySections } from '@/lib/db/stories'
import type { StorySection } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const story = await getStoryById(params.id)
    if (!story || story.userId !== user.id) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    return NextResponse.json({ story })
  } catch (err) {
    console.error('[/api/stories/[id]] GET', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const story = await getStoryById(params.id)
    if (!story || story.userId !== user.id) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    const body = await request.json() as { sections?: StorySection[] }
    if (!Array.isArray(body.sections)) {
      return NextResponse.json({ error: 'Missing sections array' }, { status: 400 })
    }

    await updateStorySections(params.id, body.sections)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/stories/[id]] PATCH', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
