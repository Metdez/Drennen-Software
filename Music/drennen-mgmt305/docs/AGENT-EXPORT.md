# AGENT-EXPORT.md — Agent 09: Export Engine
# Wave 2 agent. Fires after Wave 1 is merged.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md (especially GOTCHA-005)
4. DECISIONS.md (read DEC-007 and DEC-009)
5. TYPES.md

---

## YOUR JOB

Build the PDF and Word document generation functions. You own these files and ONLY these files:

```
lib/export/pdf.ts
lib/export/docx.ts
```

---

## IMPORTANT: SERVER-SIDE ONLY

Both files must NEVER be imported from client components. They use Node.js APIs.
The download flow is: client calls API route → API route calls these functions → returns buffer → client downloads.
See GOTCHA-005 in ERRORS.md.

---

## WHAT THE INPUT LOOKS LIKE

Both functions receive the raw AI output string. It looks like this:

```
This session reviewed 47 student submissions for an interview with Jane Smith...

---
**SECTION 1: ORIGIN STORY AND EARLY CAREER**

**PRIMARY:** Can you walk us through the moment you decided to leave your corporate career and start your own company?
*— Sarah M., Specific experience*

**BACKUP:** What was the thing that surprised you most about being a first-time founder?
*— James T., Strategic insight*

Strong opener. Consider following up by asking what their family thought of the decision.

---
**SECTION 2: DEFINING FAILURE OR SETBACK**
[...continues for 10 sections...]
```

---

## FILE 1: lib/export/pdf.ts

Uses `@react-pdf/renderer`. The goal is a clean, print-ready document — not a fancy designed layout.

```ts
import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer, Font } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1a1a1a',
    lineHeight: 1.6,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#f36f21',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#542785',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
    borderLeft: 3,
    borderLeftColor: '#f36f21',
    paddingLeft: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#542785',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 4,
  },
  attribution: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
})

function parseOutputToSections(output: string) {
  return output.split('---').filter(s => s.trim().length > 0)
}

function OutputDocument({ output, speakerName }: { output: string; speakerName: string }) {
  const sections = parseOutputToSections(output)

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: styles.page },
      React.createElement(View, null,
        React.createElement(Text, { style: styles.title }, 'Drennen MGMT 305'),
        React.createElement(Text, { style: styles.subtitle }, `Guest Speaker Interview Sheet — ${speakerName}`),
        ...sections.map((section, i) =>
          React.createElement(View, { key: i, style: styles.section },
            React.createElement(Text, { style: styles.text }, section.trim())
          )
        )
      )
    )
  )
}

export async function generatePDF(output: string, speakerName: string): Promise<Buffer> {
  const doc = React.createElement(OutputDocument, { output, speakerName })
  const buffer = await renderToBuffer(doc)
  return buffer
}
```

---

## FILE 2: lib/export/docx.ts

Uses the `docx` npm package. Parses the markdown-like output into structured Word document elements.

```ts
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
} from 'docx'

function buildDocxContent(output: string, speakerName: string) {
  const children: Paragraph[] = []

  // Title
  children.push(new Paragraph({
    text: 'Drennen MGMT 305',
    heading: HeadingLevel.HEADING_1,
  }))

  children.push(new Paragraph({
    children: [new TextRun({
      text: `Guest Speaker Interview Sheet — ${speakerName}`,
      color: '542785',
      size: 24,
    })],
    spacing: { after: 400 },
  }))

  // Parse output line by line
  const lines = output.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      children.push(new Paragraph({ text: '' }))
      continue
    }

    if (trimmed.startsWith('**SECTION')) {
      const text = trimmed.replace(/\*\*/g, '')
      children.push(new Paragraph({
        children: [new TextRun({ text, bold: true, color: '542785', size: 24 })],
        spacing: { before: 300, after: 100 },
      }))
    } else if (trimmed.startsWith('**PRIMARY:**') || trimmed.startsWith('**BACKUP:**')) {
      const label = trimmed.startsWith('**PRIMARY:**') ? 'PRIMARY: ' : 'BACKUP: '
      const question = trimmed.replace(/\*\*PRIMARY:\*\*|\*\*BACKUP:\*\*/, '').trim()
      children.push(new Paragraph({
        children: [
          new TextRun({ text: label, bold: true, color: 'f36f21' }),
          new TextRun({ text: question }),
        ],
        spacing: { before: 100 },
      }))
    } else if (trimmed.startsWith('*—')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed.replace(/\*/g, ''), italics: true, color: '888888', size: 18 })],
      }))
    } else if (trimmed === '---') {
      children.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
        spacing: { before: 200, after: 200 },
        text: '',
      }))
    } else {
      children.push(new Paragraph({ text: trimmed }))
    }
  }

  return children
}

export async function generateDocx(output: string, speakerName: string): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: buildDocxContent(output, speakerName),
    }],
  })

  return Packer.toBuffer(doc)
}
```

---

## COMPLETION CHECKLIST

- [ ] `lib/export/pdf.ts` — `generatePDF(output, speakerName)` returns a `Buffer`
- [ ] `lib/export/docx.ts` — `generateDocx(output, speakerName)` returns a `Buffer`
- [ ] Neither file has `"use client"` — server-side only
- [ ] Brand colors are applied (#f36f21 orange, #542785 purple)
- [ ] Output is readable and print-ready, not a wall of raw text
- [ ] `npx tsc --noEmit` passes with zero errors
