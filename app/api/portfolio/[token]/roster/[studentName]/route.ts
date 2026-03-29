import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioStudentDetail } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { token: string; studentName: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    if (!share.config.includeStudentProfiles) {
      return NextResponse.json({ error: 'Student profiles not included' }, { status: 404 })
    }

    const studentName = decodeURIComponent(params.studentName)
    const detail = await getPortfolioStudentDetail(share, studentName)
    if (!detail) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    return NextResponse.json(detail)
  } catch (err) {
    console.error('[/api/portfolio/[token]/roster/[studentName] GET]', err)
    return NextResponse.json({ error: 'Failed to load student detail' }, { status: 500 })
  }
}
