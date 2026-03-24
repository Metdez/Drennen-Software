// app/api/sessions/[id]/theme-analysis/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSubmissionsBySession } from '@/lib/db/student_submissions'
import { runSessionAnalysis, runThemeAnalysis } from '@/lib/ai/analysisAgent'

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

    const submissions = await getSubmissionsBySession(params.id)

    // Use session analysis to get questions per theme (Gemini clusters them semantically)
    // This makes the route self-contained — no sessionStorage dependency
    const sessionAnalysis = await runSessionAnalysis(
      session.speakerName,
      session.output,
      submissions
    )

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
