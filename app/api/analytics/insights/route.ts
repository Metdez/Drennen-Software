import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getClassInsights } from '@/lib/db/classInsights'
import { generateClassInsights } from '@/lib/ai/classInsights'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const semesterId = searchParams.get('semester') || undefined

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let insights = await getClassInsights(user.id, semesterId)

  // Fallback: generate if missing but sessions exist (covers prior fire-and-forget failures)
  if (!insights) {
    try {
      await generateClassInsights(user.id, semesterId)
      insights = await getClassInsights(user.id, semesterId)
    } catch (e) {
      console.error('[/api/analytics/insights] fallback generation failed:', e)
    }
  }

  return NextResponse.json({ insights })
}
