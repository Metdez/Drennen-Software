// app/api/sessions/[id]/analysis/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { createAdminClient } from '@/lib/supabase/server'
import { runSessionAnalysis } from '@/lib/ai/analysisAgent'
import { getSessionAnalysis, insertSessionAnalysis } from '@/lib/db/sessionAnalyses'

export const dynamic = 'force-dynamic'

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

    // Return cached analysis from DB if available (avoids Gemini call on repeat visits)
    const cached = await getSessionAnalysis(params.id)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Use admin client — ownership already verified above; avoids RLS auth dependency
    const supabase = createAdminClient()
    const { data: submRows, error: submError } = await supabase
      .from('student_submissions')
      .select('student_name, submission_text')
      .eq('session_id', params.id)
      .order('created_at', { ascending: true })

    if (submError) throw new Error(`Failed to fetch submissions: ${submError.message}`)

    const submissions = (submRows ?? []).map((r) => ({
      student_name: r.student_name ?? '',
      submission_text: r.submission_text ?? '',
    }))

    if (submissions.length === 0) {
      return NextResponse.json({ empty: true })
    }

    const analysis = await runSessionAnalysis(
      session.speakerName,
      session.output,
      submissions
    )

    // Persist to DB so future visits are instant
    await insertSessionAnalysis(params.id, user.id, analysis).catch(e =>
      console.error('[/api/sessions/[id]/analysis] insertSessionAnalysis failed (non-fatal):', e)
    )

    return NextResponse.json(analysis)
  } catch (err) {
    console.error('[/api/sessions/[id]/analysis]', err)
    let message = err instanceof Error ? err.message : String(err)
    // Gemini SDK sometimes wraps its error JSON as the message string — unwrap it
    try {
      const parsed = JSON.parse(message)
      if (parsed?.error?.message) message = parsed.error.message
    } catch { /* not JSON, use as-is */ }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
