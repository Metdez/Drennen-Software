import { NextResponse } from 'next/server'
import { getSessionByShareToken } from '@/lib/db/sessionShares'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const session = await getSessionByShareToken(params.token)
    if (!session) {
      return NextResponse.json(
        { error: 'This session is no longer available' },
        { status: 404 }
      )
    }

    // Strip userId for privacy — only return what viewers need
    return NextResponse.json({
      session: {
        speakerName: session.speakerName,
        createdAt: session.createdAt,
        fileCount: session.fileCount,
        output: session.output,
      },
    })
  } catch (err) {
    console.error('[/api/shared/[token]]', err)
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 })
  }
}
