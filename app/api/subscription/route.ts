import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { checkSubscriptionAccess } from '@/lib/db/subscription'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const access = await checkSubscriptionAccess(user.id)
  return NextResponse.json(access)
}
