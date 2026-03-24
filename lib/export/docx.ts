import { Document, Packer, Paragraph, TextRun } from 'docx'

interface Question {
  label: string
  text: string
  attribution: string
}

interface Section {
  title: string
  primary: Question | null
  backup: Question | null
}

function parseOutput(output: string): Section[] {
  const sections: Section[] = []
  let current: Section | null = null

  for (const raw of output.split('\n')) {
    const line = raw.trim()
    if (!line || line === '**Top Student Questions**') continue

    const titleMatch = line.match(/^\*{3}(\d+\.\s+.+?)\*{3}$/)
    if (titleMatch) {
      if (current) sections.push(current)
      current = { title: titleMatch[1], primary: null, backup: null }
      continue
    }

    const qMatch = line.match(/^\*\*(Primary|Backup):\*\*\s+(.*?)\s*\*\(([^)]+)\)\*\s*$/)
    if (qMatch && current) {
      const q: Question = { label: qMatch[1], text: qMatch[2], attribution: qMatch[3] }
      if (q.label === 'Primary') current.primary = q
      else current.backup = q
    }
  }

  if (current) sections.push(current)
  return sections
}

function questionParagraph(q: Question): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${q.label}: `, bold: true }),
      new TextRun({ text: q.text + ' ' }),
      new TextRun({ text: `(${q.attribution})`, italics: true }),
    ],
    spacing: { before: 80, after: 80 },
  })
}

function buildDocxContent(output: string, speakerName: string): Paragraph[] {
  const children: Paragraph[] = []

  children.push(new Paragraph({
    children: [new TextRun({ text: 'MGMT 305', bold: true, size: 36 })],
    spacing: { after: 80 },
  }))

  children.push(new Paragraph({
    children: [new TextRun({ text: `Guest Speaker Interview Sheet — ${speakerName}`, size: 24 })],
    spacing: { after: 320 },
  }))

  children.push(new Paragraph({
    children: [new TextRun({ text: 'Top Student Questions', bold: true, size: 22 })],
    spacing: { after: 240 },
  }))

  for (const section of parseOutput(output)) {
    children.push(new Paragraph({
      children: [new TextRun({ text: section.title, bold: true, italics: true, size: 22 })],
      spacing: { before: 160, after: 80 },
    }))

    if (section.primary) children.push(questionParagraph(section.primary))
    if (section.backup) children.push(questionParagraph(section.backup))
  }

  return children
}

export async function generateDocx(output: string, speakerName: string): Promise<Buffer> {
  const doc = new Document({
    sections: [{ properties: {}, children: buildDocxContent(output, speakerName) }],
  })
  return Packer.toBuffer(doc)
}
