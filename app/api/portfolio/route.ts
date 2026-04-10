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

/**
 * GET /api/portfolio
 *
 * Returns the current portfolio share state for the authenticated professor,
 * including whether sharing is enabled, the share token, and the visibility config.
 *
 * @returns
 *   - `{ exists: false }` when no portfolio share has been created yet.
 *   - `{ exists: true, enabled: boolean, shareToken: string, config: PortfolioConfig }`
 *     when a portfolio share record exists.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - The `enabled` flag controls whether the public portfolio URL is live.
 *     A disabled portfolio returns 404 to unauthenticated visitors.
 *   - Each professor has at most one row in `portfolio_shares`.
 * @see {@link lib/db/portfolioShares.ts} — `getPortfolioShare()`
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const share = await getPortfolioShare(user.id)
    if (!share) {
      // No portfolio has been configured yet for this professor
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

/**
 * POST /api/portfolio
 *
 * Creates or fully replaces the portfolio share configuration for the authenticated
 * professor. Generates a new share token if one does not yet exist.
 *
 * @param request - JSON body:
 *   ```json
 *   {
 *     "config": {
 *       "includeAnalytics": true,
 *       "includeReports": false,
 *       "includeStudentProfiles": true,
 *       "includeSessions": true
 *     }
 *   }
 *   ```
 *   `config` is a `PortfolioConfig` object controlling which sections are publicly
 *   visible. All four boolean fields should be provided.
 * @returns `{ shareToken, shareUrl, config, enabled }` — the full share state
 *   including the absolute public URL.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - This is an upsert — calling POST again with a different config replaces the
 *     existing config while preserving the share token.
 *   - The `enabled` field is not set here; use PATCH to toggle it.
 * @see {@link lib/db/portfolioShares.ts} — `upsertPortfolioShare()`
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const config = body.config as PortfolioConfig

    const share = await upsertPortfolioShare(user.id, config)
    // Build the absolute public URL from the request origin
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

/**
 * PATCH /api/portfolio
 *
 * Partially updates the portfolio share: toggles the `enabled` flag and/or
 * updates the `PortfolioConfig`. Both fields are optional; only provided fields
 * are applied.
 *
 * @param request - JSON body (all fields optional):
 *   ```json
 *   {
 *     "enabled": true,
 *     "config": { "includeAnalytics": false }
 *   }
 *   ```
 * @returns The full updated share state:
 *   `{ exists, enabled, shareToken, shareUrl, config }`
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - If both `enabled` and `config` are provided, `enabled` is applied first,
 *     then `config` is upserted separately.
 *   - `shareUrl` is `null` in the response if no share record exists yet.
 * @see {@link lib/db/portfolioShares.ts} — `togglePortfolioShare()`, `upsertPortfolioShare()`, `getPortfolioShare()`
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Apply enable/disable toggle if provided
    if (body.enabled !== undefined) {
      await togglePortfolioShare(user.id, body.enabled)
    }

    // Apply config update if provided (upsert preserves existing token)
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

/**
 * DELETE /api/portfolio
 *
 * Regenerates the portfolio share token, effectively revoking any previously
 * shared links. The portfolio config and enabled state are preserved.
 *
 * @returns `{ shareToken: string, shareUrl: string }` — the newly generated token
 *   and its absolute public URL. Old links using the previous token will 404.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - This is a token-rotation operation, not a true deletion. The portfolio
 *     share row continues to exist in `portfolio_shares`.
 *   - Useful when a professor wants to revoke access to everyone who has the
 *     old link (e.g. after sharing it with a temporary audience).
 * @see {@link lib/db/portfolioShares.ts} — `regeneratePortfolioToken()`
 */
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
