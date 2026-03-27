import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { SpeakerBriefContent } from '@/types'

const ORANGE = '#f36f21'

const styles = StyleSheet.create({
  page: {
    padding: 56,
    paddingTop: 24,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1a1a1a',
    lineHeight: 1.6,
    backgroundColor: '#FAFAF8',
  },
  accentBar: {
    height: 4,
    backgroundColor: ORANGE,
    marginBottom: 28,
    marginHorizontal: -56,
    marginTop: 0,
  },
  courseLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#666666',
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
  },
  speakerName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 28,
  },
  sectionContainer: {
    marginBottom: 20,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: ORANGE,
    borderLeftStyle: 'solid' as const,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#333333',
  },
  themeItem: {
    marginBottom: 6,
  },
  themeTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  themeDesc: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#333333',
  },
  talkingPointNumber: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: ORANGE,
  },
  talkingPointText: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#333333',
  },
  talkingPointRationale: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
    marginBottom: 8,
  },
  footer: {
    position: 'absolute' as const,
    bottom: 32,
    left: 56,
    right: 56,
    textAlign: 'center' as const,
    fontSize: 9,
    color: '#999999',
  },
})

function buildBriefDocument(content: SpeakerBriefContent) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'LETTER', style: styles.page },

      // Orange accent bar
      React.createElement(View, { style: styles.accentBar }),

      // Header
      React.createElement(Text, { style: styles.courseLabel }, content.header.courseLabel),
      React.createElement(Text, { style: styles.speakerName }, `Speaker Prep Brief: ${content.header.speakerName}`),
      React.createElement(
        Text,
        { style: styles.headerMeta },
        `${content.header.date}  ·  ${content.header.studentCount} student submissions analyzed`
      ),

      // What Students Care About
      React.createElement(
        View,
        { style: styles.sectionContainer },
        React.createElement(Text, { style: styles.sectionTitle }, 'What Students Care About'),
        React.createElement(Text, { style: styles.bodyText }, content.narrative)
      ),

      // Top Themes
      React.createElement(
        View,
        { style: styles.sectionContainer },
        React.createElement(Text, { style: styles.sectionTitle }, 'Top Themes'),
        ...content.topThemes.map((theme, i) =>
          React.createElement(
            Text,
            { key: i, style: styles.themeItem },
            React.createElement(Text, { style: styles.themeTitle }, `${theme.title}  `),
            React.createElement(Text, { style: styles.themeDesc }, theme.description)
          )
        )
      ),

      // Suggested Talking Points
      React.createElement(
        View,
        { style: styles.sectionContainer },
        React.createElement(Text, { style: styles.sectionTitle }, 'Suggested Talking Points'),
        ...content.talkingPoints.flatMap((tp, i) => [
          React.createElement(
            Text,
            { key: `tp-${i}` },
            React.createElement(Text, { style: styles.talkingPointNumber }, `${i + 1}. `),
            React.createElement(Text, { style: styles.talkingPointText }, tp.point)
          ),
          React.createElement(
            Text,
            { key: `tr-${i}`, style: styles.talkingPointRationale },
            tp.rationale
          ),
        ])
      ),

      // Class Context
      React.createElement(
        View,
        { style: styles.sectionContainer },
        React.createElement(Text, { style: styles.sectionTitle }, 'Class Context'),
        React.createElement(Text, { style: styles.bodyText }, content.classContext)
      ),

      // What to Expect
      React.createElement(
        View,
        { style: styles.sectionContainer },
        React.createElement(Text, { style: styles.sectionTitle }, 'What to Expect'),
        React.createElement(Text, { style: styles.bodyText }, content.whatToExpect)
      ),

      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        `Prepared by ${content.header.courseLabel}  |  ${content.header.date}`
      )
    )
  )
}

export async function generateBriefPDF(content: SpeakerBriefContent): Promise<Buffer> {
  const doc = buildBriefDocument(content)
  const buffer = await renderToBuffer(doc)
  return buffer
}
