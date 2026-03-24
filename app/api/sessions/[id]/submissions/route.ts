import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSubmissionsBySession } from '@/lib/db/submissions'

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

    const submissions = await getSubmissionsBySession(params.id)
    return NextResponse.json({ submissions })

  } catch (err) {
    console.error('[/api/sessions/[id]/submissions]', err)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
