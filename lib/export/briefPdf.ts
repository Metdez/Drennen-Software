/**
 * @file briefPdf.ts
 * Exports a SpeakerBriefContent object as a branded single-page PDF document.
 *
 * Called by: app/api/sessions/[id]/brief/download/route.ts (?format=pdf)
 *
 * Library: @react-pdf/renderer — React element tree rendered to a PDF buffer
 * server-side (no browser required). All elements use React.createElement
 * instead of JSX because this file runs in a Node.js API route context.
 *
 * Document structure (single LETTER page):
 *   1. Orange accent bar spanning the full page width
 *   2. Header — course label, speaker name, submission count meta
 *   3. Five content sections, each with an orange left-border accent:
 *      - What Students Care About (narrative)
 *      - Top Themes (title + description pairs)
 *      - Suggested Talking Points (numbered, with rationale)
 *      - Class Context
 *      - What to Expect
 *   4. Footer — course label and date
 *
 * Brand color ORANGE (#f36f21) is defined as a local constant rather than
 * imported from lib/constants/brand because @react-pdf/renderer StyleSheet
 * requires plain hex strings.
 *
 * @see lib/export/briefText.ts for the plain-text variant of this same brief
 * @see types/index.ts for the SpeakerBriefContent type definition
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { SpeakerBriefContent } from '@/types'

/**
 * Defines a constant for the primary accent color used throughout the PDF document.
 *
 * It is used to maintain a consistent brand color across various elements like the accent bar, section borders, and talking point numbers.
 *
 * This is a simple string literal representing a hex color code.
 */
const ORANGE = '#f36f21'

/**
 * Defines a collection of stylesheets using `@react-pdf/renderer`'s `StyleSheet.create` method.
 *
 * It is used to centralize and encapsulate all the styling rules for the different components of the speaker brief PDF, ensuring a consistent visual presentation.
 *
 * Each key in this object corresponds to a specific visual element or section within the PDF, such as pages, headers, body text, and footers. Styles are defined using properties similar to CSS, but tailored for the PDF rendering context.
 */
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

/**
 * Assembles the complete @react-pdf/renderer Document element tree for a speaker brief.
 * Each logical section is wrapped in a `sectionContainer` View with an orange left border
 * to visually separate content without page breaks (everything fits on one LETTER page).
 *
 * Talking points are rendered as a flat array of alternating point + rationale Text nodes
 * via `flatMap` because @react-pdf/renderer does not support nested fragment children.
 *
 * @param content - Fully typed speaker brief content from the `speaker_briefs` table
 */
/**
 * Assembles the complete `@react-pdf/renderer` Document element tree for a speaker brief.
 *
 * It is used to construct the visual layout and content structure of the PDF document based on the provided `SpeakerBriefContent` data.
 *
 * The function leverages `React.createElement` to programmatically build the component tree. Each logical section (e.g., 'What Students Care About', 'Top Themes') is wrapped in a `sectionContainer` View, which features an orange left border for visual separation. Talking points are rendered using `flatMap` to generate a flat array of alternating point and rationale `Text` nodes, circumventing `@react-pdf/renderer`'s limitation regarding nested fragment children.
 */
function buildBriefDocument(content: SpeakerBriefContent) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'LETTER', style: styles.page },

      // Full-width orange accent bar — negative marginHorizontal bleeds it past the page padding
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

/**
 * Generates a PDF buffer for a speaker prep brief.
 *
 * @param content - Typed speaker brief content (themes, talking points, context, header metadata)
 * @returns       - PDF as a Node.js Buffer, ready to stream as application/pdf
 *
 * @remarks Uses @react-pdf/renderer's `renderToBuffer` which runs entirely server-side.
 * @see app/api/sessions/[id]/brief/download/route.ts
 */
/**
 * Generates a PDF buffer for a speaker prep brief.
 *
 * It is used as the main public interface for creating the PDF output, taking structured content and returning a streamable buffer.
 *
 * This asynchronous function first calls `buildBriefDocument` to create the React PDF document element and then uses `@react-pdf/renderer`'s `renderToBuffer` to convert that document into a Node.js Buffer. This process runs entirely server-side, making it suitable for API routes or backend services. The resulting buffer can be streamed as an `application/pdf` response.
 */
export async function generateBriefPDF(content: SpeakerBriefContent): Promise<Buffer> {
  const doc = buildBriefDocument(content)
  const buffer = await renderToBuffer(doc)
  return buffer
}
