import { NextResponse } from 'next/server'
import { getPortalByShareToken } from '@/lib/db/speakerPortals'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const result = await getPortalByShareToken(params.token)

    if (!result) {
      return NextResponse.json(
        { error: 'This portal is no longer available.' },
        { status: 404 }
      )
    }

    const { portal } = result
    const content = portal.editedContent ?? portal.content

    return NextResponse.json({
      welcome: content.welcome,
      studentInterests: content.studentInterests,
      sampleQuestions: content.sampleQuestions ?? null,
      talkingPoints: content.talkingPoints,
      audienceProfile: content.audienceProfile,
      pastSpeakerInsights: content.pastSpeakerInsights,
      postSession: portal.postSession,
    })
  } catch (err) {
    console.error('[/api/speaker/[token]] GET', err)
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    )
  }
}
