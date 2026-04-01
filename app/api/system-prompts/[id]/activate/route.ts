import { NextResponse } from 'next/server'
import { activatePromptVersion, getPromptById } from '@/lib/db/systemPrompts'
import { getCurrentUser } from '@/lib/db/users'

export const dynamic = 'force-dynamic'

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prompt = await getPromptById(params.id)
    if (!prompt || prompt.userId !== user.id) {
      return NextResponse.json({ error: 'Prompt version not found' }, { status: 404 })
    }

    await activatePromptVersion(user.id, params.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/system-prompts/[id]/activate PATCH]', err)
    return NextResponse.json({ error: 'Failed to activate system prompt version' }, { status: 500 })
  }
}
