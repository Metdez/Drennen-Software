import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getAnalytics } from '@/lib/db/analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semester') || undefined

    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await getAnalytics(user.id, semesterId)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/analytics]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
