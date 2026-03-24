import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { buildSubmissionsText } from '@/lib/parse/builder'
import { generateQuestionSheet } from '@/lib/ai/client'
import { insertSession } from '@/lib/db/sessions'
import { downloadTempZip, deleteTempZip } from '@/lib/supabase/storage'

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

    const { text, fileCount } = await buildSubmissionsText(zipBuffer)

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

    return NextResponse.json({
      sessionId: session.id,
      output: session.output,
      fileCount: session.fileCount,
    })

  } catch (err) {
    console.error('[/api/process]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (storagePath) await deleteTempZip(storagePath).catch(() => {})
  }
}
