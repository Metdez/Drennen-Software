import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioLanding } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
    }

    const landing = await getPortfolioLanding(share)

    return NextResponse.json({
      semesters: landing.semesters,
      sessions: landing.sessions,
      totalStudents: landing.totalStudents,
      totalSubmissions: landing.totalSubmissions,
      dateRange: landing.dateRange,
      sections: landing.sections,
    })
  } catch (err) {
    console.error('[/api/portfolio/[token] GET]', err)
    return NextResponse.json({ error: 'Failed to load portfolio' }, { status: 500 })
  }
}
