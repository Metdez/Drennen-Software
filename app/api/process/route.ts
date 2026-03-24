import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { buildSubmissionsText } from '@/lib/parse/builder'
import { generateQuestionSheet } from '@/lib/ai/client'
import { insertSession } from '@/lib/db/sessions'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const speakerName = formData.get('speakerName') as string | null
    const file = formData.get('file') as File | null

    if (!speakerName?.trim()) {
      return NextResponse.json({ error: 'Missing speakerName' }, { status: 400 })
    }
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'File must be a ZIP archive' }, { status: 400 })
    }

    // Convert File to Buffer (see GOTCHA-004)
    const arrayBuffer = await file.arrayBuffer()
    const zipBuffer = Buffer.from(arrayBuffer)

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
  }
}
