import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getThemeFrequency } from '@/lib/db/themes'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const semesterId = searchParams.get('semester') || undefined

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const themes = await getThemeFrequency(user.id, semesterId)
  return NextResponse.json({ themes })
}
