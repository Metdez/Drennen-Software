import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { SemesterStory } from '@/types'

// ── Brand colors ──

const ORANGE = '#f36f21'
const PURPLE = '#542785'
const DARK_TEXT = '#1a1a1a'
const MUTED_TEXT = '#666666'

// ── Styles ──

const s = StyleSheet.create({
  page: {
    padding: 60,
    paddingBottom: 72,
    fontFamily: 'Helvetica',
    fontSize: 11.5,
    color: DARK_TEXT,
    lineHeight: 1.85,
  },
  coverPage: {
    padding: 60,
    fontFamily: 'Helvetica',
    fontSize: 11.5,
    color: DARK_TEXT,
    lineHeight: 1.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverAccent: {
    width: 80,
    height: 5,
    backgroundColor: ORANGE,
    marginBottom: 28,
    borderRadius: 3,
  },
  coverTitle: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: PURPLE,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 400,
  },
  coverSubtitle: {
    fontSize: 13,
    color: MUTED_TEXT,
    textAlign: 'center',
    marginBottom: 6,
  },
  coverDate: {
    fontSize: 11,
    color: MUTED_TEXT,
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: PURPLE,
    marginBottom: 6,
    marginTop: 8,
  },
  sectionAccent: {
    width: 40,
    height: 3,
    backgroundColor: ORANGE,
    marginBottom: 16,
    borderRadius: 2,
  },
  paragraph: {
    fontSize: 11.5,
    lineHeight: 1.85,
    marginBottom: 12,
    color: DARK_TEXT,
  },
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 60,
    right: 60,
    fontSize: 9,
    color: MUTED_TEXT,
    textAlign: 'center',
  },
})

// ── Components ──

function CoverPage({ story }: { story: SemesterStory }) {
  const date = new Date(story.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return React.createElement(
    Page,
    { size: 'LETTER', style: s.coverPage },
    React.createElement(View, { style: s.coverAccent }),
    React.createElement(Text, { style: s.coverTitle }, story.title),
    React.createElement(Text, { style: s.coverSubtitle }, 'A Semester Narrative'),
    React.createElement(Text, { style: s.coverDate }, `Generated ${date}`),
  )
}

function SectionBlock({ title, body }: { title: string; body: string }) {
  const paragraphs = body.split(/\n\n+/).filter(Boolean)
  return React.createElement(
    View,
    { style: { marginBottom: 20 } },
    React.createElement(Text, { style: s.sectionTitle }, title),
    React.createElement(View, { style: s.sectionAccent }),
    ...paragraphs.map((text, i) =>
      React.createElement(Text, { key: i, style: s.paragraph }, text.trim())
    ),
  )
}

function ContentPage({ story }: { story: SemesterStory }) {
  return React.createElement(
    Page,
    { size: 'LETTER', style: s.page, wrap: true },
    ...story.sections.map((section, i) =>
      React.createElement(SectionBlock, {
        key: i,
        title: section.title,
        body: section.body,
      })
    ),
    React.createElement(
      Text,
      { style: s.footer, render: ({ pageNumber }) => `${pageNumber}` },
    ),
  )
}

// ── Export ──

export async function generateStoryPDF(story: SemesterStory): Promise<Uint8Array> {
  const doc = buildDocument(story)
  const buffer = await renderToBuffer(doc)
  return new Uint8Array(buffer)
}

function buildDocument(story: SemesterStory) {
  return React.createElement(
    Document,
    null,
    React.createElement(CoverPage, { story }),
    React.createElement(ContentPage, { story }),
  )
}
