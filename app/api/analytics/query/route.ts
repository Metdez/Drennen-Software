import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { runAnalyticsQuery } from '@/lib/ai/sqlAgent'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { question?: string }
    const question = body.question?.trim()

    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }

    const { answer, sql } = await runAnalyticsQuery(question)
    return NextResponse.json({ answer, sql })

  } catch (err) {
    console.error('[/api/analytics/query]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
