import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { buildSubmissionsText } from '@/lib/parse/builder'
import { generateQuestionSheet } from '@/lib/ai/client'
import { insertSession, insertStudentSubmissions, insertSessionThemes } from '@/lib/db/sessions'
import { downloadTempZip, deleteTempZip } from '@/lib/supabase/storage.server'
import { parseThemesFromOutput, themesOverlap } from '@/lib/parse/parseThemes'
import { getRecentThemeTitles } from '@/lib/db/themes'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let storagePath: string | null = null
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { speakerName?: string; storagePath?: string }
    const speakerName = body.speakerName ?? null
    storagePath = body.storagePath ?? null

    if (!speakerName?.trim()) {
      return NextResponse.json({ error: 'Missing speakerName' }, { status: 400 })
    }
    if (!storagePath) {
      return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 })
    }
    const zipBuffer = await downloadTempZip(storagePath)

    const { text, fileCount, submissions } = await buildSubmissionsText(zipBuffer)

    if (fileCount === 0) {
      return NextResponse.json({ error: 'No readable student files found in ZIP' }, { status: 400 })
    }

    const { output } = await generateQuestionSheet(speakerName.trim(), text)

    const session = await insertSession({
      userId: user.id,
      speakerName: speakerName.trim(),
      output,
      fileCount,
    })

    // Persist per-student and per-theme data for analytics queries (non-blocking failures)
    const parsedThemes = parseThemesFromOutput(output)
    let overlappingThemes: string[] = []

    await Promise.all([
      insertStudentSubmissions(session.id, submissions).catch((e) =>
        console.error('[/api/process] insertStudentSubmissions failed:', e)
      ),
      insertSessionThemes(session.id, parsedThemes).catch((e) =>
        console.error('[/api/process] insertSessionThemes failed:', e)
      ),
    ])

    // Compute overlap against recent sessions (non-fatal)
    try {
      if (parsedThemes.length > 0) {
        const recentTitles = await getRecentThemeTitles(user.id, session.id, 5)
        overlappingThemes = parsedThemes
          .filter(t => recentTitles.some(r => themesOverlap(t.themeTitle, r)))
          .map(t => t.themeTitle)
      }
    } catch (e) {
      console.error('[/api/process] overlap detection failed (non-fatal):', e)
    }

    return NextResponse.json({
      sessionId: session.id,
      output: session.output,
      fileCount: session.fileCount,
      overlappingThemes,
    })

  } catch (err) {
    console.error('[/api/process]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (storagePath) await deleteTempZip(storagePath).catch(() => {})
  }
}
