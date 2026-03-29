import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import {
  getPortfolioShare,
  upsertPortfolioShare,
  togglePortfolioShare,
  regeneratePortfolioToken,
} from '@/lib/db/portfolioShares'
import type { PortfolioConfig } from '@/types'

export const dynamic = 'force-dynamic'

/** GET — return current portfolio share state */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const share = await getPortfolioShare(user.id)
    if (!share) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
      exists: true,
      enabled: share.enabled,
      shareToken: share.shareToken,
      config: share.config,
    })
  } catch (err) {
    console.error('[/api/portfolio GET]', err)
    return NextResponse.json({ error: 'Failed to fetch portfolio share' }, { status: 500 })
  }
}

/** POST — create or update portfolio share with config */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const config = body.config as PortfolioConfig

    const share = await upsertPortfolioShare(user.id, config)
    const origin = new URL(request.url).origin

    return NextResponse.json({
      shareToken: share.shareToken,
      shareUrl: `${origin}/portfolio/${share.shareToken}`,
      config: share.config,
      enabled: share.enabled,
    })
  } catch (err) {
    console.error('[/api/portfolio POST]', err)
    return NextResponse.json({ error: 'Failed to create portfolio share' }, { status: 500 })
  }
}

/** PATCH — toggle enabled or update config */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    if (body.enabled !== undefined) {
      await togglePortfolioShare(user.id, body.enabled)
    }

    if (body.config) {
      await upsertPortfolioShare(user.id, body.config as PortfolioConfig)
    }

    const share = await getPortfolioShare(user.id)
    const origin = new URL(request.url).origin

    return NextResponse.json({
      exists: true,
      enabled: share?.enabled ?? false,
      shareToken: share?.shareToken,
      shareUrl: share ? `${origin}/portfolio/${share.shareToken}` : null,
      config: share?.config,
    })
  } catch (err) {
    console.error('[/api/portfolio PATCH]', err)
    return NextResponse.json({ error: 'Failed to update portfolio share' }, { status: 500 })
  }
}

/** DELETE — regenerate token (revokes old link) */
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const share = await regeneratePortfolioToken(user.id)
    const origin = new URL(request.url).origin

    return NextResponse.json({
      shareToken: share.shareToken,
      shareUrl: `${origin}/portfolio/${share.shareToken}`,
    })
  } catch (err) {
    console.error('[/api/portfolio DELETE]', err)
    return NextResponse.json({ error: 'Failed to regenerate token' }, { status: 500 })
  }
}
