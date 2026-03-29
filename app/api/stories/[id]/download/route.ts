import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getStoryById } from '@/lib/db/stories'
import { generateStoryPDF } from '@/lib/export/storyPdf'
import { generateStoryDocx } from '@/lib/export/storyDocx'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const story = await getStoryById(params.id)
    if (!story || story.userId !== user.id) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json(
        { error: 'Invalid format. Use ?format=pdf or ?format=docx' },
        { status: 400 }
      )
    }

    const filename = `${story.title.replace(/\s+/g, '_')}_Story`

    if (format === 'pdf') {
      const buffer = await generateStoryPDF(story)
      return new Response(Buffer.from(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      })
    }

    const buffer = await generateStoryDocx(story)
    return new Response(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    })
  } catch (err) {
    console.error('[/api/stories/[id]/download]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
