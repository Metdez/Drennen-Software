import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1a1a1a',
    lineHeight: 1.6,
  },
  docTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 12,
    color: '#1a1a1a',
    marginBottom: 20,
  },
  pageHeader: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-BoldOblique',
    marginBottom: 5,
  },
  questionLine: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  label: {
    fontFamily: 'Helvetica-Bold',
  },
  body: {
    fontFamily: 'Helvetica',
  },
  attribution: {
    fontFamily: 'Helvetica-Oblique',
  },
})

interface ParsedQuestion {
  label: string
  text: string
  attribution: string
}

interface ParsedSection {
  title: string
  primary: ParsedQuestion | null
  backup: ParsedQuestion | null
}

function parseOutput(output: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  let current: ParsedSection | null = null

  for (const raw of output.split('\n')) {
    const line = raw.trim()
    if (!line || line === '**Top Student Questions**') continue

    // Section title: ***N. Title***
    const titleMatch = line.match(/^\*{3}(\d+\.\s+.+?)\*{3}$/)
    if (titleMatch) {
      if (current) sections.push(current)
      current = { title: titleMatch[1], primary: null, backup: null }
      continue
    }

    // Primary / Backup line: **Primary:** text *(Name)*
    const qMatch = line.match(/^\*\*(Primary|Backup):\*\*\s+(.*?)\s*\*\(([^)]+)\)\*\s*$/)
    if (qMatch && current) {
      const q: ParsedQuestion = { label: qMatch[1], text: qMatch[2], attribution: qMatch[3] }
      if (q.label === 'Primary') current.primary = q
      else current.backup = q
    }
  }

  if (current) sections.push(current)
  return sections
}

function renderQuestion(q: ParsedQuestion, key: string) {
  return React.createElement(
    Text,
    { key, style: styles.questionLine },
    React.createElement(Text, { style: styles.label }, `${q.label}: `),
    React.createElement(Text, { style: styles.body }, q.text + ' '),
    React.createElement(Text, { style: styles.attribution }, `(${q.attribution})`)
  )
}

function buildDocument(output: string, speakerName: string) {
  const sections = parseOutput(output)

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'LETTER', style: styles.page },
      React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.docTitle }, 'MGMT 305'),
        React.createElement(Text, { style: styles.docSubtitle }, `Guest Speaker Interview Sheet — ${speakerName}`),
        React.createElement(Text, { style: styles.pageHeader }, 'Top Student Questions'),
        ...sections.map((section, i) =>
          React.createElement(
            View,
            { key: i, style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, section.title),
            section.primary ? renderQuestion(section.primary, 'primary') : null,
            section.backup ? renderQuestion(section.backup, 'backup') : null
          )
        )
      )
    )
  )
}

export async function generatePDF(output: string, speakerName: string): Promise<Buffer> {
  const doc = buildDocument(output, speakerName)
  const buffer = await renderToBuffer(doc)
  return buffer
}
