/**
 * @file storyPdf.ts
 * Exports a SemesterStory as a two-page branded PDF narrative document.
 *
 * Called by: app/api/stories/[id]/download/route.ts (?format=pdf)
 *
 * Library: @react-pdf/renderer — renders React element trees to PDF server-side.
 * Uses React.createElement (not JSX) via named component functions.
 *
 * Document structure:
 *   Page 1:  Cover page — orange accent bar, purple title, subtitle, generated date
 *   Page 2+: Content page — one SectionBlock per story section; auto-wraps across pages
 *
 * Each section block renders:
 *   - Section title (purple Helvetica-Bold, 18pt)
 *   - Short orange accent underline (40px wide, 3px tall)
 *   - Body text split on double-newlines into separate paragraphs
 *
 * Footer shows the page number via @react-pdf/renderer's render prop pattern:
 *   `render: ({ pageNumber }) => \`${pageNumber}\``
 *
 * Brand colors (ORANGE, PURPLE) are defined locally — same rationale as reportPdf.ts.
 *
 * @see lib/export/storyDocx.ts for the DOCX variant
 * @see lib/ai/storyAgent.ts for the agent that generates SemesterStory
 */

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

/**
 * Defines a primary brand accent color.
 *
 * It is used for visual emphasis on elements like accent bars and specific text within the generated PDF document, aligning with the application's branding.
 *
 * Important implementation details: Stored as a hexadecimal color code.
 */
const ORANGE = '#f36f21'
/**
 * Defines a primary brand color.
 *
 * It is used for prominent elements such as titles and headings in the generated PDF document, aligning with the application's branding.
 *
 * Important implementation details: Stored as a hexadecimal color code.
 */
const PURPLE = '#542785'
/**
 * Defines the primary dark text color for improved readability.
 *
 * It is used for most body text and content to ensure high contrast and legibility in the generated PDF.
 *
 * Important implementation details: Stored as a hexadecimal color code.
 */
const DARK_TEXT = '#1a1a1a'
/**
 * Defines a muted text color.
 *
 * It is used for secondary text elements like subtitles, dates, and footers, providing a visual hierarchy and less prominence compared to the main content.
 *
 * Important implementation details: Stored as a hexadecimal color code.
 */
const MUTED_TEXT = '#666666'

// ── Styles ──

/**
 * Stores a collection of PDF styling rules.
 *
 * It is used to centralize and apply consistent styling (fonts, sizes, colors, spacing, layout) across various components within the generated PDF document, leveraging `@react-pdf/renderer`'s `StyleSheet` API.
 *
 * Important implementation details: Created using `StyleSheet.create` from `@react-pdf/renderer`, with keys representing style names and values being style objects with CSS-like properties.
 */
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

/** Renders the full-page centered cover with orange accent bar, purple title, and generated date. */
/**
 * Renders the cover page of the semester narrative PDF.
 *
 * It is used to create the initial, visually distinct title page for the generated story PDF, displaying the story's main title, a descriptive subtitle, and the date it was generated.
 *
 * Important implementation details: Accepts a `SemesterStory` object as a prop. It dynamically formats the `createdAt` timestamp into a human-readable date string. Components are rendered using `React.createElement`.
 */
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

/**
 * Renders a single story section: title, orange underline accent, and body paragraphs.
 * Body text is split on `\n\n` so the AI's double-newline paragraph breaks are preserved.
 */
/**
 * Renders a single story section, which includes a title, an orange accent line, and its body text formatted into paragraphs.
 *
 * It is used to structure and present individual parts of the AI-generated narrative within the PDF, ensuring each section is clearly delineated and readable.
 *
 * Important implementation details: The `body` prop's text is split by `\n\n+` to accurately preserve and display paragraph breaks that often come from AI-generated content. Components are rendered using `React.createElement`.
 */
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

/**
 * Renders all story sections on a single auto-wrapping content page.
 * The `wrap: true` Page prop allows content to flow across physical pages.
 */
/**
 * Renders all content sections of a semester narrative story, designed to auto-wrap across multiple physical pages as needed.
 *
 * It is used to display the main body of the story, dynamically iterating over all `SectionBlock` components and including a page number in the footer.
 *
 * Important implementation details: The `Page` component utilizes the `wrap: true` prop, which is crucial for allowing content to flow seamlessly across page breaks. It iterates through `story.sections` to render each `SectionBlock` and includes a dynamic page number footer using a render function.
 */
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

/**
 * Generates a PDF buffer for a semester narrative story.
 *
 * @param story - SemesterStory from the semester_stories table
 * @returns     - PDF as Uint8Array, ready to stream as application/pdf
 */
/**
 * Generates a PDF buffer for a semester narrative story.
 *
 * This is the primary public function for transforming a `SemesterStory` data object into a complete, ready-to-use PDF document. It serves as the entry point for PDF generation, abstracting away the internal rendering details.
 *
 * Important implementation details: It is an asynchronous function that uses `renderToBuffer` from `@react-pdf/renderer` to convert the React PDF document into a `Uint8Array`. It orchestrates the `buildDocument` function to create the document structure.
 */
export async function generateStoryPDF(story: SemesterStory): Promise<Uint8Array> {
  const doc = buildDocument(story)
  const buffer = await renderToBuffer(doc)
  return new Uint8Array(buffer)
}

/**
 * Constructs the full React PDF document structure.
 *
 * It is used to logically assemble the main `Document` component, combining the `CoverPage` and `ContentPage` based on the provided `SemesterStory` data. This function separates the document composition logic from the final rendering process.
 *
 * Important implementation details: It uses `React.createElement` to define the hierarchy of the PDF document, passing the `story` object down to its child page components (`CoverPage` and `ContentPage`).
 */
function buildDocument(story: SemesterStory) {
  return React.createElement(
    Document,
    null,
    React.createElement(CoverPage, { story }),
    React.createElement(ContentPage, { story }),
  )
}
