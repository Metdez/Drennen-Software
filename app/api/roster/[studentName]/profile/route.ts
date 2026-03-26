import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getStudentProfile } from '@/lib/db/studentProfiles'
import { generateStudentProfile } from '@/lib/ai/studentProfile'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { studentName: string } }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decodedName: string
  try {
    decodedName = decodeURIComponent(params.studentName)
  } catch {
    return NextResponse.json({ error: 'Invalid student name' }, { status: 400 })
  }

  let profile = await getStudentProfile(user.id, decodedName)

  // Fallback: generate on-demand if missing (covers new students or prior fire-and-forget failures)
  if (!profile) {
    try {
      await generateStudentProfile(user.id, decodedName)
      profile = await getStudentProfile(user.id, decodedName)
    } catch (e) {
      console.error('[/api/roster/profile] fallback generation failed:', e)
    }
  }

  return NextResponse.json({ profile })
}
