import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSpeakerPortal, insertSpeakerPortal, updateSpeakerPortalEdits } from '@/lib/db/speakerPortals'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { getClassInsights, fetchInsightsInput } from '@/lib/db/classInsights'
import { createAdminClient } from '@/lib/supabase/server'
import { generateSpeakerPortalContent } from '@/lib/ai/speakerPortal'
import type { SanitizedAnalysis, SanitizedClassInsights } from '@/lib/ai/speakerBrief'
import type { SessionAnalysis, QuestionFeedback } from '@/types'

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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const portal = await getSpeakerPortal(params.id)
    return NextResponse.json({ portal })
  } catch (err) {
    console.error('[/api/sessions/[id]/portal] GET', err)
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Return existing portal if already generated
    const existing = await getSpeakerPortal(params.id)
    if (existing) {
      return NextResponse.json({ portal: existing })
    }

    const supabase = createAdminClient()

    // Fetch theme titles
    const { data: themeRows, error: themeErr } = await supabase
      .from('session_themes')
      .select('theme_title')
      .eq('session_id', params.id)
      .order('theme_number', { ascending: true })
    if (themeErr) throw new Error(`Failed to fetch themes: ${themeErr.message}`)
    const themes = (themeRows ?? []).map((r) => r.theme_title as string)

    // Fetch cached session analysis
    const analysis = await getSessionAnalysis(params.id)

    // Fetch class insights
    const classInsights = await getClassInsights(user.id)

    // Fetch debrief history for past speaker insights (section 5)
    const insightsInput = await fetchInsightsInput(user.id)
    const debriefHistory = insightsInput.sessions
      .filter(s => s.debriefRating !== null && s.sessionId !== params.id)
      .map(s => {
        // These fields may exist on extended InsightsInput versions
        const extended = s as typeof s & { debriefSpeakerFeedback?: string; debriefSurpriseMoments?: string }
        return {
          speakerName: s.speakerName,
          rating: s.debriefRating!,
          speakerFeedback: extended.debriefSpeakerFeedback ?? '',
          homeRunCount: s.debriefHomeRunCount,
          surpriseMoments: extended.debriefSurpriseMoments ?? '',
        }
      })

    // Sanitize data
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

    // Generate portal content via Gemini
    const content = await generateSpeakerPortalContent({
      speakerName: session.speakerName,
      professorName: 'Professor Drennen',
      sessionDate,
      fileCount: session.fileCount,
      themes,
      sessionOutput: session.output,
      analysis: sanitizedAnalysis,
      classInsights: sanitizedInsights,
      debriefHistory: debriefHistory.length > 0 ? debriefHistory : null,
    })

    // Persist to DB
    const portal = await insertSpeakerPortal(params.id, user.id, content)

    return NextResponse.json({ portal })
  } catch (err) {
    console.error('[/api/sessions/[id]/portal] POST', err)
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json()
    const { editedContent } = body

    await updateSpeakerPortalEdits(params.id, editedContent ?? null)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/sessions/[id]/portal] PUT', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
