import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { generateSemesterReport } from '@/lib/ai/reportAgent'
import type { ReportConfig } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as {
      title?: string
      dateRange?: { start: string; end: string }
      includedSections?: string[]
      customNotes?: string
    }

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }

    if (!Array.isArray(body.includedSections) || body.includedSections.length === 0) {
      return NextResponse.json(
        { error: 'includedSections must be a non-empty array' },
        { status: 400 }
      )
    }

    const config: ReportConfig = {
      title: body.title.trim(),
      dateRange: body.dateRange ?? null,
      includedSections: body.includedSections,
      customNotes: body.customNotes,
    }

    const { reportId, content } = await generateSemesterReport(user.id, config)

    return NextResponse.json({ reportId, content })

  } catch (err) {
    console.error('[/api/reports/generate]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
