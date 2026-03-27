import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { enableComparisonShare, revokeComparisonShare } from '@/lib/db/comparisons'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { comparisonId } = await request.json()
    if (!comparisonId) {
      return NextResponse.json({ error: 'Missing comparisonId' }, { status: 400 })
    }

    const token = await enableComparisonShare(comparisonId, user.id)
    const origin = new URL(request.url).origin

    return NextResponse.json({
      shareToken: token,
      shareUrl: `${origin}/shared/compare/${token}`,
    })
  } catch (err) {
    console.error('[/api/compare/share POST]', err)
    return NextResponse.json({ error: 'Failed to enable sharing' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { comparisonId } = await request.json()
    if (!comparisonId) {
      return NextResponse.json({ error: 'Missing comparisonId' }, { status: 400 })
    }

    await revokeComparisonShare(comparisonId, user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/compare/share DELETE]', err)
    return NextResponse.json({ error: 'Failed to revoke sharing' }, { status: 500 })
  }
}
