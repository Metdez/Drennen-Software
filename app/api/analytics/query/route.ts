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

    const body = await request.json() as { question?: string; semester?: string }
    let question = body.question?.trim()
    const semesterId = body.semester || undefined

    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }

    // Scope SQL agent queries to the selected semester
    if (semesterId) {
      question = `Only consider sessions where semester_id = '${semesterId}'. ${question}`
    }

    const { answer, sql } = await runAnalyticsQuery(question)
    return NextResponse.json({ answer, sql })

  } catch (err) {
    console.error('[/api/analytics/query]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
