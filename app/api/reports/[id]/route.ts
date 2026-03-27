import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getReportById } from '@/lib/db/reports'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const report = await getReportById(params.id)
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (report.userId !== user.id) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({ report })

  } catch (err) {
    console.error('[/api/reports/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
