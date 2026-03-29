// app/api/sessions/[id]/theme-analysis/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSubmissionsBySession } from '@/lib/db/studentSubmissions'
import { runSessionAnalysis, runThemeAnalysis } from '@/lib/ai/analysisAgent'
import { getSessionAnalysis, insertSessionAnalysis } from '@/lib/db/sessionAnalyses'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const theme = searchParams.get('theme')
    if (!theme) {
      return NextResponse.json({ error: 'Missing theme param' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Use cached session analysis if available — avoids a redundant Gemini call
    let sessionAnalysis = await getSessionAnalysis(params.id)

    if (!sessionAnalysis) {
      const submissions = await getSubmissionsBySession(params.id)
      sessionAnalysis = await runSessionAnalysis(
        session.speakerName,
        session.output,
        submissions
      )
      // Persist for future requests
      await insertSessionAnalysis(params.id, user.id, sessionAnalysis).catch(e =>
        console.error('[/api/sessions/[id]/theme-analysis] insertSessionAnalysis failed (non-fatal):', e)
      )
    }

    const cluster = sessionAnalysis.theme_clusters.find(
      (c) => c.name.toLowerCase() === theme.toLowerCase()
    ) ?? sessionAnalysis.theme_clusters[0]

    const themeAnalysis = await runThemeAnalysis(
      cluster.name,
      session.speakerName,
      cluster.questions
    )

    return NextResponse.json({
      theme_name: cluster.name,
      questions: cluster.questions,
      ...themeAnalysis,
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/theme-analysis]', err)
    return NextResponse.json({ error: 'Theme analysis failed' }, { status: 500 })
  }
}
