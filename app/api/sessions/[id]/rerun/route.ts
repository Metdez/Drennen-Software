import { NextResponse } from 'next/server'
import { generateQuestionSheet } from '@/lib/ai/client'
import { generateClassInsights } from '@/lib/ai/classInsights'
import { generateAndCacheSessionAnalysis } from '@/lib/ai/generateSessionAnalysis'
import { generateStudentProfiles } from '@/lib/ai/studentProfile'
import { classifyAndStoreTiers } from '@/lib/ai/tierClassifier'
import { getActivePrompt } from '@/lib/db/systemPrompts'
import { insertSession, insertSessionThemes, insertStudentSubmissions, getSessionById } from '@/lib/db/sessions'
import { getSubmissionsBySession } from '@/lib/db/studentSubmissions'
import { checkSubscriptionAccess, decrementFreeSession } from '@/lib/db/subscription'
import { getCurrentUser } from '@/lib/db/users'
import { formatSubmissionsForAi, type ParsedSubmission } from '@/lib/parse/builder'
import { parseThemesFromOutput } from '@/lib/parse/parseThemes'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkSubscriptionAccess(user.id)
    if (!access.canGenerate) {
      return NextResponse.json(
        { error: 'subscription_required', reason: access.reason },
        { status: 403 }
      )
    }

    const originalSession = await getSessionById(params.id)
    if (!originalSession || originalSession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const submissionRows = await getSubmissionsBySession(params.id)
    if (submissionRows.length === 0) {
      return NextResponse.json(
        { error: 'Original submissions unavailable for re-processing.' },
        { status: 400 }
      )
    }

    const submissions: ParsedSubmission[] = submissionRows.map((row) => ({
      studentName: row.student_name,
      filename: row.filename,
      text: row.submission_text,
    }))
    const text = formatSubmissionsForAi(submissions)

    const activePrompt = await getActivePrompt(user.id)
    const { output } = await generateQuestionSheet(
      originalSession.speakerName,
      text,
      activePrompt?.promptText ?? undefined
    )

    const session = await insertSession({
      userId: user.id,
      speakerName: originalSession.speakerName,
      output,
      fileCount: submissions.length,
      semesterId: originalSession.semesterId,
      promptVersionId: activePrompt?.id ?? null,
    })

    if (access.reason === 'free_session') {
      await decrementFreeSession(user.id)
    }

    const parsedThemes = parseThemesFromOutput(output)

    await Promise.all([
      insertStudentSubmissions(session.id, submissions).catch((e) =>
        console.error('[/api/sessions/[id]/rerun] insertStudentSubmissions failed:', e)
      ),
      insertSessionThemes(session.id, parsedThemes).catch((e) =>
        console.error('[/api/sessions/[id]/rerun] insertSessionThemes failed:', e)
      ),
    ])

    generateClassInsights(user.id, originalSession.semesterId ?? undefined).catch((e) =>
      console.error('[/api/sessions/[id]/rerun] generateClassInsights failed (non-fatal):', e)
    )

    generateAndCacheSessionAnalysis(
      session.id,
      user.id,
      session.speakerName,
      session.output,
      submissions.map((s) => ({ student_name: s.studentName, submission_text: s.text }))
    ).catch((e) =>
      console.error('[/api/sessions/[id]/rerun] generateAndCacheSessionAnalysis failed (non-fatal):', e)
    )

    generateStudentProfiles(user.id, [...new Set(submissions.map((s) => s.studentName))]).catch((e) =>
      console.error('[/api/sessions/[id]/rerun] generateStudentProfiles failed (non-fatal):', e)
    )

    classifyAndStoreTiers(session.id, session.speakerName, session.output).catch((e) =>
      console.error('[/api/sessions/[id]/rerun] classifyAndStoreTiers failed (non-fatal):', e)
    )

    return NextResponse.json({
      sessionId: session.id,
      output: session.output,
      fileCount: session.fileCount,
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/rerun POST]', err)
    const message = err instanceof Error ? err.message : 'Failed to rerun session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
