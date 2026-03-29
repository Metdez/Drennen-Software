import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioReportById } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { token: string; reportId: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    if (!share.config.includeReports) {
      return NextResponse.json({ error: 'Reports not included' }, { status: 404 })
    }

    const report = await getPortfolioReportById(share, params.reportId)
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    return NextResponse.json(report)
  } catch (err) {
    console.error('[/api/portfolio/[token]/reports/[reportId] GET]', err)
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 })
  }
}
