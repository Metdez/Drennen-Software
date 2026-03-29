import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioSessionDetail } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { token: string; sessionId: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    const detail = await getPortfolioSessionDetail(share, params.sessionId)
    if (!detail) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    return NextResponse.json(detail)
  } catch (err) {
    console.error('[/api/portfolio/[token]/sessions/[sessionId] GET]', err)
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 })
  }
}
