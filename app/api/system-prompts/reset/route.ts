import { NextResponse } from 'next/server'
import { resetToDefault } from '@/lib/db/systemPrompts'
import { getCurrentUser } from '@/lib/db/users'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await resetToDefault(user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/system-prompts/reset POST]', err)
    return NextResponse.json({ error: 'Failed to reset system prompt' }, { status: 500 })
  }
}
