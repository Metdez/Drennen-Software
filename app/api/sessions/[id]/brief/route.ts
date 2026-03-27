import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSpeakerBrief, insertSpeakerBrief, updateSpeakerBriefEdits } from '@/lib/db/speakerBriefs'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { getClassInsights } from '@/lib/db/classInsights'
import { createAdminClient } from '@/lib/supabase/server'
import { generateSpeakerBrief } from '@/lib/ai/speakerBrief'
import type { SanitizedAnalysis, SanitizedClassInsights } from '@/lib/ai/speakerBrief'
import type { SessionAnalysis } from '@/types'

export const dynamic = 'force-dynamic'

function sanitizeAnalysis(analysis: SessionAnalysis): SanitizedAnalysis {
  return {
    theme_clusters: analysis.theme_clusters.map((c) => ({
      name: c.name,
      question_count: c.question_count,
      top_question: c.top_question,
    })),
    tensions: analysis.tensions,
    suggestions: analysis.suggestions,
    blind_spots: analysis.blind_spots,
    sentiment: analysis.sentiment,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const brief = await getSpeakerBrief(params.id)
    return NextResponse.json({ brief })
  } catch (err) {
    console.error('[/api/sessions/[id]/brief] GET', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Return existing brief if already generated
    const existing = await getSpeakerBrief(params.id)
    if (existing) {
      return NextResponse.json({ brief: existing })
    }

    // Gather data for brief generation
    const supabase = createAdminClient()

    // Fetch theme titles for this session
    const { data: themeRows, error: themeErr } = await supabase
      .from('session_themes')
      .select('theme_title')
      .eq('session_id', params.id)
      .order('theme_number', { ascending: true })
    if (themeErr) throw new Error(`Failed to fetch themes: ${themeErr.message}`)
    const themes = (themeRows ?? []).map((r) => r.theme_title as string)

    // Fetch cached session analysis (already persisted by /api/process)
    const analysis = await getSessionAnalysis(params.id)

    // Fetch class insights for this professor
    const classInsights = await getClassInsights(user.id)

    // Sanitize data — strip all student PII
    const sanitizedAnalysis: SanitizedAnalysis | null = analysis
      ? sanitizeAnalysis(analysis)
      : null

    const sanitizedInsights: SanitizedClassInsights | null = classInsights
      ? {
          narrative: classInsights.narrative,
          qualityTrend: classInsights.qualityTrend,
          topThemes: classInsights.topThemes.map((t) => ({
            title: t.title,
            sessionCount: t.sessionCount,
          })),
        }
      : null

    const sessionDate = new Date(session.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Generate brief via Gemini
    const content = await generateSpeakerBrief({
      speakerName: session.speakerName,
      sessionDate,
      fileCount: session.fileCount,
      themes,
      analysis: sanitizedAnalysis,
      classInsights: sanitizedInsights,
    })

    // Persist to DB
    const brief = await insertSpeakerBrief(params.id, user.id, content)

    return NextResponse.json({ brief })
  } catch (err) {
    console.error('[/api/sessions/[id]/brief] POST', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json()
    const { editedContent } = body

    await updateSpeakerBriefEdits(params.id, editedContent ?? null)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/sessions/[id]/brief] PUT', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
