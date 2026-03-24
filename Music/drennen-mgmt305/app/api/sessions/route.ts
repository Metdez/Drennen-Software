import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionsByUser } from '@/lib/db/sessions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await getSessionsByUser(user.id)
    return NextResponse.json({ sessions })

  } catch (err) {
    console.error('[/api/sessions]', err)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}
