import { NextResponse } from 'next/server'
import { getSessionAnalysisByShareToken } from '@/lib/db/sessionShares'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const analysis = await getSessionAnalysisByShareToken(params.token)
    if (!analysis) {
      return NextResponse.json({ empty: true })
    }

    return NextResponse.json(analysis)
  } catch (err) {
    console.error('[/api/shared/[token]/analysis]', err)
    return NextResponse.json({ error: 'Failed to load analysis' }, { status: 500 })
  }
}
