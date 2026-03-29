import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  PageBreak,
} from 'docx'
import type { SemesterStory } from '@/types'

function titleParagraph(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold: true, size: 52, color: '542785' })],
    spacing: { after: 200 },
  })
}

function subtitleParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, size: 24, color: '666666', italics: true })],
    spacing: { after: 100 },
  })
}

function dateParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, size: 20, color: '999999' })],
    spacing: { after: 600 },
  })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 28, color: '542785' })],
    spacing: { before: 360, after: 200 },
  })
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 160, line: 360 },
  })
}

export async function generateStoryDocx(story: SemesterStory): Promise<Buffer> {
  const date = new Date(story.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const children: Paragraph[] = [
    titleParagraph(story.title),
    subtitleParagraph('A Semester Narrative'),
    dateParagraph(`Generated ${date}`),
  ]

  story.sections.forEach((section, i) => {
    // Page break before first section (after title page content)
    if (i === 0) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      )
    }

    children.push(sectionHeading(section.title))

    const paragraphs = section.body.split(/\n\n+/).filter(Boolean)
    for (const text of paragraphs) {
      children.push(bodyParagraph(text.trim()))
    }
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}
