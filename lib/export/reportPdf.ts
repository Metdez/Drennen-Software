/**
 * @file reportPdf.ts
 * Exports a SemesterReport as a branded, multi-page PDF document.
 *
 * Called by: app/api/reports/[id]/download/route.ts (?format=pdf)
 *
 * Library: @react-pdf/renderer — React element tree rendered to PDF buffer server-side.
 * All elements are created with React.createElement (no JSX) because this runs in a
 * Node.js API route context where JSX transform is not configured for this file.
 *
 * Document structure:
 *   1. Cover page  (branded title, date range, course label)
 *   2. Table of contents  (auto-generated from present sections)
 *   3. One page per report section, rendered only if present in report.content
 *
 * Brand colors are defined as local constants here rather than imported from
 * lib/constants/brand.ts because @react-pdf/renderer requires plain hex strings
 * in StyleSheet — the BRAND object values resolve to the same hex but keeping
 * them co-located prevents any future BRAND type divergence from breaking PDFs.
 *
 * Section rendering components (ExecutiveSummary, SemesterGlance, etc.) are
 * internal React components used only by buildDocument(). Each accepts a single
 * `data` prop typed to its corresponding report section type from types/report.ts.
 *
 * SVG sub-components (BarChart, ProgressBar) are rendered inline using the
 * @react-pdf/renderer Svg primitives, enabling data visualization without a canvas.
 *
 * @see lib/export/reportDocx.ts for the plain DOCX variant of this report
 * @see types/report.ts for the SemesterReport type and all section subtypes
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Svg,
  Rect,
  Line,
  G,
  Text as SvgText,
} from '@react-pdf/renderer'
import type {
  SemesterReport,
  ReportContent,
  ExecutiveSummarySection,
  SemesterGlanceSection,
  SessionSummariesSection,
  ThemeEvolutionSection,
  StudentEngagementSection,
  StudentGrowthSection,
  QuestionQualitySection,
  BlindSpotsSection,
  SpeakerEffectivenessSection,
  AppendixRosterSection,
} from '@/types/report'

// ── Brand colors ──
// Kept as local constants (not imported from lib/constants/brand) because
// @react-pdf/renderer StyleSheet requires plain hex strings.

/**
 * Defines the hexadecimal color code for orange, used as a primary accent color throughout the report.
 *
 * Why it is used:
 * This color is part of the brand palette and serves to highlight key elements, borders, and specific text within the PDF report.
 *
 * Important implementation details:
 * It is explicitly defined as a local constant rather than imported from a shared `brand` constants file because `@react-pdf/renderer`'s `StyleSheet` requires plain hex string values, which can sometimes be problematic with imported constants or more complex color objects.
 */
const ORANGE = '#f36f21'
/**
 * Defines the hexadecimal color code for purple, used as a primary brand color for headings and significant values in the report.
 *
 * Why it is used:
 * This color is part of the brand palette and provides a strong visual identity for titles, high-value metrics, and background elements in the PDF report.
 *
 * Important implementation details:
 * It is explicitly defined as a local constant rather than imported from a shared `brand` constants file because `@react-pdf/renderer`'s `StyleSheet` requires plain hex string values, which can sometimes be problematic with imported constants or more complex color objects.
 */
const PURPLE = '#542785'
/**
 * Defines the hexadecimal color code for green, typically used to indicate positive trends, highlights, or successful outcomes.
 *
 * Why it is used:
 * This color is part of the brand palette and provides visual cues for positive indicators, such as successful recommendations or 'improving' trends, within the PDF report.
 *
 * Important implementation details:
 * It is explicitly defined as a local constant rather than imported from a shared `brand` constants file because `@react-pdf/renderer`'s `StyleSheet` requires plain hex string values, which can sometimes be problematic with imported constants or more complex color objects.
 */
const GREEN = '#0f6b37'
/**
 * Defines the hexadecimal color code for a light gray, primarily used as a subtle background for cards, metric boxes, or alternating table rows.
 *
 * Why it is used:
 * This neutral color helps to visually separate content blocks and improve readability without being distracting, adhering to brand guidelines for background elements.
 *
 * Important implementation details:
 * It is explicitly defined as a local constant rather than imported from a shared `brand` constants file because `@react-pdf/renderer`'s `StyleSheet` requires plain hex string values, which can sometimes be problematic with imported constants or more complex color objects.
 */
const LIGHT_GRAY = '#f5f5f5'
/**
 * Defines the hexadecimal color code for a medium gray, used for borders, lines, and progress bar backgrounds.
 *
 * Why it is used:
 * This color provides subtle separation and structure within the report, particularly for table borders, chart baselines, and inactive parts of progress bars.
 *
 * Important implementation details:
 * It is explicitly defined as a local constant rather than imported from a shared `brand` constants file because `@react-pdf/renderer`'s `StyleSheet` requires plain hex string values, which can sometimes be problematic with imported constants or more complex color objects.
 */
const MID_GRAY = '#e0e0e0'
/**
 * Defines the hexadecimal color code for a dark text color, used for primary content text.
 *
 * Why it is used:
 * Ensures high readability for the main body text of the report by providing sufficient contrast against lighter backgrounds, aligning with accessibility best practices.
 *
 * Important implementation details:
 * It is explicitly defined as a local constant rather than imported from a shared `brand` constants file because `@react-pdf/renderer`'s `StyleSheet` requires plain hex string values, which can sometimes be problematic with imported constants or more complex color objects.
 */
const DARK_TEXT = '#1a1a1a'
/**
 * Defines the hexadecimal color code for a muted gray text color, used for secondary information, labels, and less prominent text.
 *
 * Why it is used:
 * Provides a visual hierarchy for text, allowing less critical information (like footnotes, chart labels, or descriptive text) to be present without competing with primary headings and body content.
 *
 * Important implementation details:
 * It is explicitly defined as a local constant rather than imported from a shared `brand` constants file because `@react-pdf/renderer`'s `StyleSheet` requires plain hex string values, which can sometimes be problematic with imported constants or more complex color objects.
 */
const MUTED_TEXT = '#666666'

// ── Styles ──

/**
 * This constant holds the stylesheet object created using `@react-pdf/renderer`'s `StyleSheet.create` method.
 *
 * Why it is used:
 * It centralizes all the styling rules for the entire PDF report, making it easier to manage and maintain a consistent visual design. By using `StyleSheet.create`, styles are optimized by `@react-pdf/renderer` for performance and consistency across PDF elements.
 *
 * Important implementation details:
 * Styles are grouped logically (e.g., `page`, `coverPage`, `tocTitle`, `tableHeader`) to improve readability and organization. Many styles leverage the brand color constants defined earlier in the file. It defines styles for basic typography, layout containers, specific components like metric cards, tables, tags, progress bars, and a fixed footer.
 */
const s = StyleSheet.create({
  // Page defaults
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: DARK_TEXT,
    lineHeight: 1.6,
  },

  // ── Cover page ──
  coverPage: {
    padding: 48,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: DARK_TEXT,
    lineHeight: 1.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverAccent: {
    width: 80,
    height: 6,
    backgroundColor: ORANGE,
    marginBottom: 24,
    borderRadius: 3,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: PURPLE,
    textAlign: 'center',
    marginBottom: 10,
  },
  coverSubtitle: {
    fontSize: 14,
    color: MUTED_TEXT,
    textAlign: 'center',
    marginBottom: 6,
  },
  coverDate: {
    fontSize: 11,
    color: MUTED_TEXT,
    textAlign: 'center',
    marginTop: 16,
  },
  coverBrand: {
    fontSize: 10,
    color: ORANGE,
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'Helvetica-Bold',
  },

  // ── TOC ──
  tocTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: PURPLE,
    marginBottom: 20,
  },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  tocNumber: {
    width: 24,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: ORANGE,
  },
  tocLabel: {
    fontSize: 11,
    color: DARK_TEXT,
  },

  // ── Section pages ──
  sectionHeader: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: PURPLE,
    marginBottom: 16,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  subHeader: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: DARK_TEXT,
    marginTop: 14,
    marginBottom: 8,
  },
  narrative: {
    fontSize: 11,
    lineHeight: 1.7,
    marginBottom: 12,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 14,
    fontSize: 11,
    color: ORANGE,
    fontFamily: 'Helvetica-Bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
  },

  // ── Metrics grid ──
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    padding: 10,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: PURPLE,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 8,
    color: MUTED_TEXT,
    textAlign: 'center',
  },

  // ── Tables ──
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PURPLE,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: MID_GRAY,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: MID_GRAY,
    backgroundColor: LIGHT_GRAY,
  },
  tableCell: {
    fontSize: 9,
    paddingHorizontal: 4,
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
  },

  // ── Tag / badge ──
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  tag: {
    fontSize: 7,
    backgroundColor: '#eee4f6',
    color: PURPLE,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
  },

  // ── Progress bar ──
  progressOuter: {
    height: 10,
    backgroundColor: MID_GRAY,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressInner: {
    height: 10,
    borderRadius: 5,
  },

  // ── Cards ──
  card: {
    padding: 10,
    marginBottom: 8,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: ORANGE,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  cardBody: {
    fontSize: 10,
    lineHeight: 1.5,
    color: MUTED_TEXT,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: MUTED_TEXT,
  },

  // ── Misc ──
  spacer: {
    height: 12,
  },
  trendBadge: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  checkmark: {
    fontSize: 9,
    color: GREEN,
    textAlign: 'center',
  },
  dash: {
    fontSize: 9,
    color: MID_GRAY,
    textAlign: 'center',
  },
})

// ── Section label map ──
// Maps report content keys to their human-readable display names for the TOC.

/**
 * This constant is a record (object) that maps internal report content keys (like `executive_summary`) to their human-readable display names (e.g., 'Executive Summary').
 *
 * Why it is used:
 * It ensures that section titles in the Table of Contents and potentially elsewhere in the report are consistently presented with user-friendly names, abstracting away the more programmatic keys used in the `SemesterReport` data structure.
 *
 * Important implementation details:
 * The keys correspond directly to the property names within the `ReportContent` type, and the values are the desired titles for display.
 */
const SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  semester_at_a_glance: 'Semester at a Glance',
  session_summaries: 'Session Summaries',
  theme_evolution: 'Theme Evolution',
  student_engagement: 'Student Engagement',
  student_growth: 'Student Growth',
  question_quality: 'Question Quality',
  blind_spots: 'Blind Spots & Recommendations',
  speaker_effectiveness: 'Speaker Effectiveness',
  appendix_roster: 'Appendix: Full Roster',
}

// ── Helpers ──

/** Formats an ISO date string to short locale date (e.g. "Apr 4, 2026"). Returns raw string on parse failure. */
/**
 * Formats an ISO date string into a short, locale-specific date format (e.g., "Apr 4, 2026").
 *
 * Why it is used:
 * Provides a consistent and user-friendly date representation throughout the PDF report, improving readability compared to raw ISO strings.
 *
 * Important implementation details:
 * It uses `Date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` for formatting. Includes basic error handling; if the input `d` is empty or cannot be parsed into a valid `Date` object, it returns the original string or an empty string to prevent application crashes.
 */
function fmtDate(d: string): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

/** Converts a 0–1 decimal ratio to a percentage string (e.g. 0.875 → "88%"). */
/**
 * Converts a decimal ratio (ranging from 0 to 1) into a rounded percentage string (e.g., 0.875 becomes "88%").
 *
 * Why it is used:
 * Offers a standardized and easily understandable way to display rates and proportions in the report, which are often provided as decimal values in the underlying data.
 *
 * Important implementation details:
 * Multiplies the input number by 100, rounds it to the nearest whole number using `Math.round()`, and appends the '%' symbol.
 */
function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

/**
 * Truncates a string to `max` characters, appending an ellipsis if needed.
 * Used to prevent long speaker/theme names from overflowing fixed-width table cells.
 */
/**
 * Truncates a given string to a maximum length, appending an ellipsis ('…') if the original string exceeds that maximum.
 *
 * Why it is used:
 * Prevents text overflow in fixed-width containers, particularly in tables where speaker names, theme titles, or other labels might be too long to fit comfortably. This maintains the visual integrity and layout of the PDF.
 *
 * Important implementation details:
 * It checks if the string's length is already less than or equal to `max`. If not, it slices the string to `max - 1` characters and appends the Unicode ellipsis character `\u2026`.
 */
function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 1) + '\u2026'
}

// ── SVG visualizations ──
// These components use @react-pdf/renderer's Svg primitives to render charts inline.
// They return null when there is no data to avoid empty SVG elements in the PDF.

/**
 * Renders an SVG bar chart (submissions per session) using @react-pdf/renderer Svg primitives.
 * Bars are centered within the available width; value labels appear above each bar,
 * and truncated speaker/label names appear below.
 */
/**
 * Renders a vertical bar chart using `@react-pdf/renderer`'s SVG primitives. It visualizes data as bars, typically showing 'submissions per session'.
 *
 * Why it is used:
 * Provides a clear and concise visual representation of quantitative data (e.g., submission counts) over discrete categories (e.g., sessions/speakers), making trends and comparisons easily digestible in the report.
 *
 * Important implementation details:
 * Accepts `data` (an array of `label`/`value` objects), `width`, and `height`. It calculates `maxVal` to scale bar heights proportionally. Bars are centered, and value labels appear above the bars, while truncated `label` names appear below. It includes a horizontal baseline for reference. Returns `null` if the `data` array is empty to avoid rendering an empty SVG element, which helps keep the PDF clean.
 */
function BarChart({
  data,
  width,
  height,
}: {
  data: Array<{ label: string; value: number }>
  width: number
  height: number
}) {
  if (!data.length) return null
  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const barAreaTop = 10
  const barAreaBottom = height - 30
  const barAreaHeight = barAreaBottom - barAreaTop
  const barWidth = Math.min(36, (width - 40) / data.length - 8)
  const totalBarsWidth = data.length * (barWidth + 8) - 8
  const startX = (width - totalBarsWidth) / 2

  return React.createElement(
    Svg,
    { width, height, viewBox: `0 0 ${width} ${height}` },
    // Horizontal baseline
    React.createElement(Line, {
      x1: 10,
      y1: barAreaBottom,
      x2: width - 10,
      y2: barAreaBottom,
      stroke: MID_GRAY,
      strokeWidth: 1,
    }),
    // Bars and labels
    ...data.flatMap((d, i) => {
      const barHeight = (d.value / maxVal) * barAreaHeight
      const x = startX + i * (barWidth + 8)
      const y = barAreaBottom - barHeight
      return [
        React.createElement(Rect, {
          key: `bar-${i}`,
          x,
          y,
          width: barWidth,
          height: barHeight,
          fill: PURPLE,
          rx: 2,
        }),
        React.createElement(
          SvgText,
          {
            key: `val-${i}`,
            x: x + barWidth / 2,
            y: y - 4,
            fill: DARK_TEXT,
            textAnchor: 'middle' as const,
            style: { fontSize: 7 },
          } as React.ComponentProps<typeof SvgText>,
          String(d.value)
        ),
        React.createElement(
          SvgText,
          {
            key: `lbl-${i}`,
            x: x + barWidth / 2,
            y: barAreaBottom + 12,
            fill: MUTED_TEXT,
            textAnchor: 'middle' as const,
            style: { fontSize: 6 },
          } as React.ComponentProps<typeof SvgText>,
          truncate(d.label, 10)
        ),
      ]
    })
  )
}

/**
 * Renders a horizontal SVG progress bar.
 * The fill width is proportional to `value / max`; falls back to 0 fill when max is 0.
 * Used for tier distribution, participation tiers, and question quality breakdowns.
 */
/**
 * Renders a horizontal progress bar using `@react-pdf/renderer`'s SVG primitives. It visually represents a value's proportion to a maximum.
 *
 * Why it is used:
 * Offers an intuitive way to display progress, distribution, or participation rates (e.g., student tiers, question quality breakdowns) as a fill within a defined track. This helps users quickly grasp relative magnitudes.
 *
 * Important implementation details:
 * Takes `value`, `max`, `width`, and `color` as props. It draws a background `Rect` (using `MID_GRAY`) for the full width and a foreground `Rect` whose `width` is proportional to `value / max`. It handles the edge case where `max` is zero to prevent division by zero, resulting in a 0 fill width.
 */
function ProgressBar({
  value,
  max,
  width,
  color,
}: {
  value: number
  max: number
  width: number
  color: string
}) {
  const fillWidth = max > 0 ? (value / max) * width : 0
  return React.createElement(
    Svg,
    { width, height: 10, viewBox: `0 0 ${width} 10` },
    React.createElement(Rect, {
      x: 0,
      y: 0,
      width,
      height: 10,
      fill: MID_GRAY,
      rx: 5,
    }),
    React.createElement(Rect, {
      x: 0,
      y: 0,
      width: fillWidth,
      height: 10,
      fill: color,
      rx: 5,
    })
  )
}

/**
 * Fixed-position page footer rendered on every page.
 * Shows the report title on the left and "pageNumber / totalPages" on the right.
 * The `fixed` prop from @react-pdf/renderer pins it to the bottom of each page
 * without consuming flow space in the section content area.
 */
/**
 * A React component that renders a fixed-position footer at the bottom of every page in the PDF.
 *
 * Why it is used:
 * Ensures consistent branding and navigation elements (report title and page numbers) are present on every page, enhancing the professional appearance and usability of the report. The `fixed` prop is crucial for this persistent placement.
 *
 * Important implementation details:
 * It uses the `fixed` prop from `@react-pdf/renderer` to ensure it stays at the specified position regardless of content flow. It displays the report title on the left and dynamically renders `pageNumber / totalPages` on the right using a `render` prop on the `Text` component.
 */
function PageFooter({ title }: { title: string }) {
  return React.createElement(
    View,
    { style: s.footer, fixed: true },
    React.createElement(Text, null, title),
    React.createElement(
      Text,
      { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }
    )
  )
}

// ════════════════════════════════════════════
//  Section renderers
//  Each function accepts a typed section data prop and returns a React element
//  tree to be wrapped in a Page by buildDocument(). They are only instantiated
//  when the corresponding section key is present in report.content.
// ════════════════════════════════════════════

// ── 1. Executive Summary ──

/**
 * Renders the Executive Summary section: narrative paragraph, key metrics cards grid,
 * and an optional highlights bullet list.
 * Metrics are displayed in two rows of card tiles using the `metricsRow` + `metricCard` styles.
 */
/**
 * Renders the "Executive Summary" section of the report. This section provides a high-level overview of key insights and performance.
 *
 * Why it is used:
 * To give stakeholders a quick, concise understanding of the report's most important findings and metrics without needing to delve into every detail.
 *
 * Important implementation details:
 * It displays a narrative paragraph, a grid of key metrics presented as interactive cards (`metricsRow`, `metricCard` styles), and an optional bulleted list of highlights. Metrics include total sessions, submissions, students, average submissions per session, and participation rate.
 */
function ExecutiveSummary({ data }: { data: ExecutiveSummarySection }) {
  const km = data.keyMetrics
  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: s.sectionHeader }, 'Executive Summary'),
    React.createElement(Text, { style: s.narrative }, data.narrative),

    // Key metrics grid
    React.createElement(Text, { style: s.subHeader }, 'Key Metrics'),
    React.createElement(
      View,
      { style: s.metricsRow },
      React.createElement(
        View,
        { style: s.metricCard },
        React.createElement(Text, { style: s.metricValue }, String(km.totalSessions)),
        React.createElement(Text, { style: s.metricLabel }, 'Sessions')
      ),
      React.createElement(
        View,
        { style: s.metricCard },
        React.createElement(Text, { style: s.metricValue }, String(km.totalSubmissions)),
        React.createElement(Text, { style: s.metricLabel }, 'Submissions')
      ),
      React.createElement(
        View,
        { style: s.metricCard },
        React.createElement(Text, { style: s.metricValue }, String(km.totalStudents)),
        React.createElement(Text, { style: s.metricLabel }, 'Students')
      )
    ),
    React.createElement(
      View,
      { style: s.metricsRow },
      React.createElement(
        View,
        { style: s.metricCard },
        React.createElement(Text, { style: s.metricValue }, km.avgSubmissionsPerSession.toFixed(1)),
        React.createElement(Text, { style: s.metricLabel }, 'Avg per Session')
      ),
      React.createElement(
        View,
        { style: s.metricCard },
        React.createElement(Text, { style: s.metricValue }, pct(km.participationRate)),
        React.createElement(Text, { style: s.metricLabel }, 'Participation Rate')
      )
    ),

    // Highlights
    data.highlights.length > 0
      ? React.createElement(
          View,
          null,
          React.createElement(Text, { style: s.subHeader }, 'Highlights'),
          ...data.highlights.map((h, i) =>
            React.createElement(
              View,
              { key: i, style: s.bullet },
              React.createElement(Text, { style: s.bulletDot }, '\u2022'),
              React.createElement(Text, { style: s.bulletText }, h)
            )
          )
        )
      : null
  )
}

// ── 2. Semester at a Glance ──

/**
 * Renders the Semester at a Glance section: stats card row, a BarChart of
 * submissions per session, and ProgressBar tier-distribution rows.
 */
/**
 * Renders the "Semester at a Glance" section, providing an overview of overall semester activity.
 *
 * Why it is used:
 * To present a summary of the semester's statistical data and high-level distributions, giving a quick snapshot of performance.
 *
 * Important implementation details:
 * It includes a row of general statistics cards (similar to the Executive Summary), a `BarChart` visualizing submissions per session by speaker, and `ProgressBar` components to show the distribution of student tiers.
 */
function SemesterGlance({ data }: { data: SemesterGlanceSection }) {
  const chartData = data.sessionsOverTime.map((s) => ({
    label: s.speakerName,
    value: s.submissionCount,
  }))

  const tierEntries = Object.entries(data.tierDistribution)
  const maxTier = Math.max(...tierEntries.map(([, v]) => v), 1)

  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: s.sectionHeader }, 'Semester at a Glance'),

    // Stats grid
    React.createElement(
      View,
      { style: s.metricsRow },
      React.createElement(
        View,
        { style: s.metricCard },
        React.createElement(Text, { style: s.metricValue }, String(data.totalSessions)),
        React.createElement(Text, { style: s.metricLabel }, 'Sessions')
      ),
      React.createElement(
        View,
        { style: s.metricCard },
        React.createElement(Text, { style: s.metricValue }, String(data.totalSubmissions)),
        React.createElement(Text, { style: s.metricLabel }, 'Submissions')
      ),
      React.createElement(
        View,
        { style: s.metricCard },
        React.createElement(Text, { style: s.metricValue }, String(data.totalStudents)),
        React.createElement(Text, { style: s.metricLabel }, 'Students')
      ),
      React.createElement(
        View,
        { style: s.metricCard },
        React.createElement(Text, { style: s.metricValue }, data.avgSubmissionsPerSession.toFixed(1)),
        React.createElement(Text, { style: s.metricLabel }, 'Avg / Session')
      )
    ),

    // Submissions bar chart
    chartData.length > 0
      ? React.createElement(
          View,
          { style: { marginBottom: 16 } },
          React.createElement(Text, { style: s.subHeader }, 'Submissions per Session'),
          React.createElement(BarChart, { data: chartData, width: 500, height: 160 })
        )
      : null,

    // Tier distribution bars
    tierEntries.length > 0
      ? React.createElement(
          View,
          null,
          React.createElement(Text, { style: s.subHeader }, 'Tier Distribution'),
          ...tierEntries.map(([tier, count], i) =>
            React.createElement(
              View,
              { key: i, style: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 } },
              React.createElement(
                Text,
                { style: { width: 60, fontSize: 9, fontFamily: 'Helvetica-Bold' } },
                tier
              ),
              React.createElement(ProgressBar, {
                value: count,
                max: maxTier,
                width: 300,
                color: PURPLE,
              }),
              React.createElement(
                Text,
                { style: { fontSize: 9, marginLeft: 8, color: MUTED_TEXT } },
                String(count)
              )
            )
          )
        )
      : null
  )
}

// ── 3. Session Summaries ──

/**
 * Renders the Session Summaries section as a striped table: speaker, date, file count,
 * debrief rating, and theme tags (capped at 4 tags per session to prevent overflow).
 * Speaker names are truncated to 18 characters via `truncate()`.
 */
/**
 * Renders the "Session Summaries" section, displaying a tabular breakdown of individual sessions.
 *
 * Why it is used:
 * To provide a detailed, session-by-session log, allowing readers to quickly review key information about each teaching engagement.
 *
 * Important implementation details:
 * It presents data in a striped table format, showing speaker name (truncated), date (formatted), file count, debrief rating, and relevant themes (displayed as tags, with a maximum of 4 per session to prevent overflow). The `truncate` helper is used for speaker names to maintain table layout.
 */
function SessionSummaries({ data }: { data: SessionSummariesSection }) {
  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: s.sectionHeader }, 'Session Summaries'),

    // Table header
    React.createElement(
      View,
      { style: s.tableHeader },
      React.createElement(Text, { style: { ...s.tableHeaderCell, width: 110 } }, 'Speaker'),
      React.createElement(Text, { style: { ...s.tableHeaderCell, width: 70 } }, 'Date'),
      React.createElement(Text, { style: { ...s.tableHeaderCell, width: 40 } }, 'Files'),
      React.createElement(Text, { style: { ...s.tableHeaderCell, width: 50 } }, 'Rating'),
      React.createElement(Text, { style: { ...s.tableHeaderCell, flex: 1 } }, 'Themes')
    ),

    // Table rows
    ...data.sessions.map((sess, i) =>
      React.createElement(
        View,
        { key: i, style: i % 2 === 0 ? s.tableRow : s.tableRowAlt, wrap: false },
        React.createElement(
          Text,
          { style: { ...s.tableCellBold, width: 110 } },
          truncate(sess.speakerName, 18)
        ),
        React.createElement(Text, { style: { ...s.tableCell, width: 70 } }, fmtDate(sess.date)),
        React.createElement(
          Text,
          { style: { ...s.tableCell, width: 40, textAlign: 'center' } },
          String(sess.fileCount)
        ),
        React.createElement(
          Text,
          { style: { ...s.tableCell, width: 50, textAlign: 'center' } },
          sess.debriefRating != null ? `${sess.debriefRating}/5` : '\u2014'
        ),
        React.createElement(
          View,
          { style: { ...s.tagRow, flex: 1, paddingHorizontal: 4 } },
          ...sess.themes.slice(0, 4).map((t, ti) =>
            React.createElement(Text, { key: ti, style: s.tag }, truncate(t, 20))
          )
        )
      )
    )
  )
}

// ── 4. Theme Evolution ──

/**
 * Renders the "Theme Evolution" section, illustrating how key themes emerged and developed throughout the semester.
 *
 * Why it is used:
 * To provide insights into the thematic progression and focus areas over the course of the semester, highlighting recurring topics and their duration.
 *
 * Important implementation details:
 * It includes an introductory narrative, a table of 'Dominant Themes' showing their total count and first/last seen dates, and a 'Session Theme Timeline' that lists themes associated with each individual session.
 */
function ThemeEvolution({ data }: { data: ThemeEvolutionSection }) {
  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: s.sectionHeader }, 'Theme Evolution'),
    React.createElement(Text, { style: s.narrative }, data.narrative),

    // Dominant themes table
    data.dominantThemes.length > 0
      ? React.createElement(
          View,
          null,
          React.createElement(Text, { style: s.subHeader }, 'Dominant Themes'),
          React.createElement(
            View,
            { style: s.tableHeader },
            React.createElement(Text, { style: { ...s.tableHeaderCell, flex: 1 } }, 'Theme'),
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 50 } }, 'Count'),
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 80 } }, 'First Seen'),
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 80 } }, 'Last Seen')
          ),
          ...data.dominantThemes.map((t, i) =>
            React.createElement(
              View,
              { key: i, style: i % 2 === 0 ? s.tableRow : s.tableRowAlt, wrap: false },
              React.createElement(Text, { style: { ...s.tableCellBold, flex: 1 } }, t.title),
              React.createElement(
                Text,
                { style: { ...s.tableCell, width: 50, textAlign: 'center' } },
                String(t.totalCount)
              ),
              React.createElement(Text, { style: { ...s.tableCell, width: 80 } }, fmtDate(t.firstSeen)),
              React.createElement(Text, { style: { ...s.tableCell, width: 80 } }, fmtDate(t.lastSeen))
            )
          )
        )
      : null,

    // Timeline: sessions x themes
    data.timeline.length > 0
      ? React.createElement(
          View,
          { style: { marginTop: 14 } },
          React.createElement(Text, { style: s.subHeader }, 'Session Theme Timeline'),
          ...data.timeline.map((entry, i) =>
            React.createElement(
              View,
              { key: i, style: { marginBottom: 8 } },
              React.createElement(
                Text,
                { style: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 } },
                `${entry.speakerName} (${fmtDate(entry.date)})`
              ),
              React.createElement(
                View,
                { style: s.tagRow },
                ...entry.themes.map((t, ti) =>
                  React.createElement(Text, { key: ti, style: s.tag }, t)
                )
              )
            )
          )
        )
      : null
  )
}

// ── 5. Student Engagement ──

/**
 * Renders the "Student Engagement" section, detailing student participation and interaction.
 *
 * Why it is used:
 * To analyze and present data on how students engaged with the material and sessions, identifying top contributors and potential disengagement.
 *
 * Important implementation details:
 * It visualizes 'Participation Tiers' using `ProgressBar` components (categorized as High, Medium, Low engagement), lists 'Top Contributors' in a table (showing student name, sessions participated, and rate), and identifies 'Disengaged Students' with their last known activity.
 */
function StudentEngagement({ data }: { data: StudentEngagementSection }) {
  const tiers = data.participationTiers
  const totalTiers = tiers.high + tiers.medium + tiers.low || 1

  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: s.sectionHeader }, 'Student Engagement'),

    // Participation tiers
    React.createElement(Text, { style: s.subHeader }, 'Participation Tiers'),
    React.createElement(
      View,
      { style: { marginBottom: 12 } },
      // High
      React.createElement(
        View,
        { style: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 } },
        React.createElement(
          Text,
          { style: { width: 80, fontSize: 9, fontFamily: 'Helvetica-Bold' } },
          `High (80%+)`
        ),
        React.createElement(ProgressBar, { value: tiers.high, max: totalTiers, width: 240, color: GREEN }),
        React.createElement(
          Text,
          { style: { fontSize: 9, marginLeft: 8, color: MUTED_TEXT } },
          `${tiers.high} students`
        )
      ),
      // Medium
      React.createElement(
        View,
        { style: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 } },
        React.createElement(
          Text,
          { style: { width: 80, fontSize: 9, fontFamily: 'Helvetica-Bold' } },
          'Med (50-80%)'
        ),
        React.createElement(ProgressBar, { value: tiers.medium, max: totalTiers, width: 240, color: ORANGE }),
        React.createElement(
          Text,
          { style: { fontSize: 9, marginLeft: 8, color: MUTED_TEXT } },
          `${tiers.medium} students`
        )
      ),
      // Low
      React.createElement(
        View,
        { style: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 } },
        React.createElement(
          Text,
          { style: { width: 80, fontSize: 9, fontFamily: 'Helvetica-Bold' } },
          'Low (<50%)'
        ),
        React.createElement(ProgressBar, { value: tiers.low, max: totalTiers, width: 240, color: '#cc3333' }),
        React.createElement(
          Text,
          { style: { fontSize: 9, marginLeft: 8, color: MUTED_TEXT } },
          `${tiers.low} students`
        )
      )
    ),

    // Top contributors
    data.topContributors.length > 0
      ? React.createElement(
          View,
          null,
          React.createElement(Text, { style: s.subHeader }, 'Top Contributors'),
          React.createElement(
            View,
            { style: s.tableHeader },
            React.createElement(Text, { style: { ...s.tableHeaderCell, flex: 1 } }, 'Student'),
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 70 } }, 'Sessions'),
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 70 } }, 'Rate')
          ),
          ...data.topContributors.map((c, i) =>
            React.createElement(
              View,
              { key: i, style: i % 2 === 0 ? s.tableRow : s.tableRowAlt, wrap: false },
              React.createElement(Text, { style: { ...s.tableCellBold, flex: 1 } }, c.studentName),
              React.createElement(
                Text,
                { style: { ...s.tableCell, width: 70, textAlign: 'center' } },
                `${c.sessionCount}/${c.totalSessions}`
              ),
              React.createElement(
                Text,
                { style: { ...s.tableCell, width: 70, textAlign: 'center' } },
                pct(c.rate)
              )
            )
          )
        )
      : null,

    // Dropoff
    data.dropoff.length > 0
      ? React.createElement(
          View,
          { style: { marginTop: 12 } },
          React.createElement(Text, { style: s.subHeader }, 'Disengaged Students'),
          ...data.dropoff.map((d, i) =>
            React.createElement(
              View,
              { key: i, style: s.bullet },
              React.createElement(Text, { style: s.bulletDot }, '\u2022'),
              React.createElement(
                Text,
                { style: s.bulletText },
                `${d.studentName} \u2014 last seen: ${d.lastSeenSpeaker} (${fmtDate(d.lastSeenDate)})`
              )
            )
          )
        )
      : null
  )
}

// ── 6. Student Growth ──

/**
 * Renders the "Student Growth" section, focusing on individual student development.
 *
 * Why it is used:
 * To highlight specific instances of student improvement or significant learning journeys identified throughout the semester.
 *
 * Important implementation details:
 * It includes an introductory narrative and an optional list of 'Growth Highlights'. Each highlight is presented as a 'card' (`s.card` style) containing the student's name, number of sessions participated, and a narrative description of their growth.
 */
function StudentGrowth({ data }: { data: StudentGrowthSection }) {
  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: s.sectionHeader }, 'Student Growth'),
    React.createElement(Text, { style: s.narrative }, data.narrative),

    data.highlights.length > 0
      ? React.createElement(
          View,
          null,
          React.createElement(Text, { style: s.subHeader }, 'Growth Highlights'),
          ...data.highlights.map((h, i) =>
            React.createElement(
              View,
              { key: i, style: s.card },
              React.createElement(
                Text,
                { style: s.cardTitle },
                `${h.studentName} (${h.sessionsParticipated} sessions)`
              ),
              React.createElement(Text, { style: s.cardBody }, h.narrative)
            )
          )
        )
      : null
  )
}

// ── 7. Question Quality ──

/**
 * Renders the "Question Quality" section, evaluating the quality of questions or submissions over time.
 *
 * Why it is used:
 * To provide insights into the intellectual depth and effectiveness of student or participant contributions, showing overall trends and per-session breakdowns.
 *
 * Important implementation details:
 * It features a 'trend badge' indicating if quality is 'improving', 'declining', or 'stable' (colored green, red, or muted gray respectively), an introductory narrative, 'Overall Tier Distribution' using `ProgressBar` components, and a detailed 'Per-Session Breakdown' table showing tier counts for each session.
 */
function QuestionQuality({ data }: { data: QuestionQualitySection }) {
  const trendColor =
    data.trend === 'improving' ? GREEN : data.trend === 'declining' ? '#cc3333' : MUTED_TEXT
  const trendLabel =
    data.trend === 'improving'
      ? '\u2191 Improving'
      : data.trend === 'declining'
        ? '\u2193 Declining'
        : '\u2192 Stable'

  // Collect all tier keys across sessions
  const allTierKeys = new Set<string>()
  if (data.overallDistribution) {
    Object.keys(data.overallDistribution).forEach((k) => allTierKeys.add(k))
  }
  data.perSessionTiers.forEach((ps) => {
    Object.keys(ps.tierCounts).forEach((k) => allTierKeys.add(k))
  })
  const tierKeys = Array.from(allTierKeys).sort()

  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: s.sectionHeader }, 'Question Quality'),

    // Trend badge
    React.createElement(
      Text,
      { style: { ...s.trendBadge, color: trendColor, backgroundColor: LIGHT_GRAY } },
      trendLabel
    ),

    React.createElement(Text, { style: s.narrative }, data.narrative),

    // Overall distribution
    data.overallDistribution && Object.keys(data.overallDistribution).length > 0
      ? React.createElement(
          View,
          { style: { marginBottom: 12 } },
          React.createElement(Text, { style: s.subHeader }, 'Overall Tier Distribution'),
          ...Object.entries(data.overallDistribution)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([tier, count], i) => {
              const maxVal = Math.max(...Object.values(data.overallDistribution), 1)
              return React.createElement(
                View,
                {
                  key: i,
                  style: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
                },
                React.createElement(
                  Text,
                  { style: { width: 60, fontSize: 9, fontFamily: 'Helvetica-Bold' } },
                  tier
                ),
                React.createElement(ProgressBar, {
                  value: count,
                  max: maxVal,
                  width: 280,
                  color: PURPLE,
                }),
                React.createElement(
                  Text,
                  { style: { fontSize: 9, marginLeft: 8, color: MUTED_TEXT } },
                  String(count)
                )
              )
            })
        )
      : null,

    // Per-session tier table
    data.perSessionTiers.length > 0
      ? React.createElement(
          View,
          { style: { marginTop: 10 } },
          React.createElement(Text, { style: s.subHeader }, 'Per-Session Breakdown'),
          // Table header
          React.createElement(
            View,
            { style: s.tableHeader },
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 110 } }, 'Speaker'),
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 70 } }, 'Date'),
            ...tierKeys.map((tk) =>
              React.createElement(
                Text,
                { key: tk, style: { ...s.tableHeaderCell, width: 50, textAlign: 'center' } },
                tk
              )
            )
          ),
          // Rows
          ...data.perSessionTiers.map((ps, i) =>
            React.createElement(
              View,
              { key: i, style: i % 2 === 0 ? s.tableRow : s.tableRowAlt, wrap: false },
              React.createElement(
                Text,
                { style: { ...s.tableCellBold, width: 110 } },
                truncate(ps.speakerName, 18)
              ),
              React.createElement(Text, { style: { ...s.tableCell, width: 70 } }, fmtDate(ps.date)),
              ...tierKeys.map((tk) =>
                React.createElement(
                  Text,
                  { key: tk, style: { ...s.tableCell, width: 50, textAlign: 'center' } },
                  String(ps.tierCounts[tk] ?? 0)
                )
              )
            )
          )
        )
      : null
  )
}

// ── 8. Blind Spots ──

/**
 * Renders the "Blind Spots & Recommendations" section, identifying areas for improvement and proposing actions.
 *
 * Why it is used:
 * To formally document identified weaknesses or areas needing attention and to provide actionable advice for future sessions or programmatic adjustments.
 *
 * Important implementation details:
 * It presents 'Identified Blind Spots' as cards with a red left border (`#cc3333`) and 'Recommendations' as cards with a green left border (`GREEN`), visually distinguishing issues from solutions. Each card includes a title and a description/reason.
 */
function BlindSpots({ data }: { data: BlindSpotsSection }) {
  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: s.sectionHeader }, 'Blind Spots & Recommendations'),

    data.blindSpots.length > 0
      ? React.createElement(
          View,
          null,
          React.createElement(Text, { style: s.subHeader }, 'Identified Blind Spots'),
          ...data.blindSpots.map((bs, i) =>
            React.createElement(
              View,
              { key: i, style: { ...s.card, borderLeftColor: '#cc3333' } },
              React.createElement(Text, { style: s.cardTitle }, bs.title),
              React.createElement(Text, { style: s.cardBody }, bs.description)
            )
          )
        )
      : null,

    data.recommendations.length > 0
      ? React.createElement(
          View,
          { style: { marginTop: 10 } },
          React.createElement(Text, { style: s.subHeader }, 'Recommendations'),
          ...data.recommendations.map((r, i) =>
            React.createElement(
              View,
              { key: i, style: { ...s.card, borderLeftColor: GREEN } },
              React.createElement(Text, { style: s.cardTitle }, r.text),
              React.createElement(Text, { style: s.cardBody }, r.reason)
            )
          )
        )
      : null
  )
}

// ── 9. Speaker Effectiveness ──

/**
 * Renders the "Speaker Effectiveness" section, providing an evaluation of speaker performance.
 *
 * Why it is used:
 * To assess and rank speakers based on metrics such as debrief ratings, average submission tier, and submission counts, offering data-driven feedback.
 *
 * Important implementation details:
 * It includes an introductory narrative and a 'Speaker Rankings' table. The table lists speakers with their rank, date of session, debrief rating, average submission tier, and total submission count. Rank numbers are highlighted in orange.
 */
function SpeakerEffectiveness({ data }: { data: SpeakerEffectivenessSection }) {
  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: s.sectionHeader }, 'Speaker Effectiveness'),
    React.createElement(Text, { style: s.narrative }, data.narrative),

    data.rankings.length > 0
      ? React.createElement(
          View,
          null,
          React.createElement(Text, { style: s.subHeader }, 'Speaker Rankings'),
          React.createElement(
            View,
            { style: s.tableHeader },
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 24 } }, '#'),
            React.createElement(Text, { style: { ...s.tableHeaderCell, flex: 1 } }, 'Speaker'),
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 70 } }, 'Date'),
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 50 } }, 'Rating'),
            React.createElement(Text, { style: { ...s.tableHeaderCell, width: 55 } }, 'Avg Tier'),
            React.createElement(
              Text,
              { style: { ...s.tableHeaderCell, width: 60 } },
              'Submissions'
            )
          ),
          ...data.rankings.map((r, i) =>
            React.createElement(
              View,
              { key: i, style: i % 2 === 0 ? s.tableRow : s.tableRowAlt, wrap: false },
              React.createElement(
                Text,
                { style: { ...s.tableCellBold, width: 24, color: ORANGE } },
                String(i + 1)
              ),
              React.createElement(Text, { style: { ...s.tableCellBold, flex: 1 } }, r.speakerName),
              React.createElement(Text, { style: { ...s.tableCell, width: 70 } }, fmtDate(r.date)),
              React.createElement(
                Text,
                { style: { ...s.tableCell, width: 50, textAlign: 'center' } },
                r.debriefRating != null ? `${r.debriefRating}/5` : '\u2014'
              ),
              React.createElement(
                Text,
                { style: { ...s.tableCell, width: 55, textAlign: 'center' } },
                r.avgTier != null ? r.avgTier.toFixed(1) : '\u2014'
              ),
              React.createElement(
                Text,
                { style: { ...s.tableCell, width: 60, textAlign: 'center' } },
                String(r.submissionCount)
              )
            )
          )
        )
      : null
  )
}

// ── 10. Appendix Roster ──

/**
 * Renders the "Appendix: Full Roster" section, presenting a comprehensive list of students and their attendance across all sessions.
 *
 * Why it is used:
 * To provide a detailed record of student participation and presence for administrative purposes or further analysis, ensuring transparency and accountability.
 *
 * Important implementation details:
 * It displays student names (truncated), their overall participation rate, and a grid indicating attendance for each session. Attendance is marked with a checkmark (`\u2713`) for present and a dash (`\u2014`) for absent. Column widths for sessions are dynamically calculated to fit within the page, clamped between 30-50pt for legibility, even for many sessions.
 */
function AppendixRoster({ data }: { data: AppendixRosterSection }) {
  const sessions = data.sessionOrder
  // Column width is dynamically calculated so the attendance grid fits within 500pt.
  // Clamped between 30–50pt to stay legible; very wide rosters may push columns narrow.
  const colWidth = Math.max(30, Math.min(50, (500 - 120 - 50) / Math.max(sessions.length, 1)))

  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: s.sectionHeader }, 'Appendix: Full Roster'),

    // Header row
    React.createElement(
      View,
      { style: s.tableHeader },
      React.createElement(Text, { style: { ...s.tableHeaderCell, width: 100 } }, 'Student'),
      React.createElement(Text, { style: { ...s.tableHeaderCell, width: 40 } }, 'Rate'),
      ...sessions.map((sess) =>
        React.createElement(
          Text,
          {
            key: sess.sessionId,
            style: {
              ...s.tableHeaderCell,
              width: colWidth,
              textAlign: 'center',
              fontSize: 6,
            },
          },
          truncate(sess.speakerName, 6)
        )
      )
    ),

    // Student rows
    ...data.students.map((student, i) =>
      React.createElement(
        View,
        { key: i, style: i % 2 === 0 ? s.tableRow : s.tableRowAlt, wrap: false },
        React.createElement(
          Text,
          { style: { ...s.tableCellBold, width: 100, fontSize: 8 } },
          truncate(student.studentName, 16)
        ),
        React.createElement(
          Text,
          { style: { ...s.tableCell, width: 40, textAlign: 'center', fontSize: 8 } },
          pct(student.participationRate)
        ),
        ...sessions.map((sess) => {
          const attended = student.sessionsAttended.includes(sess.sessionId)
          return React.createElement(
            Text,
            {
              key: sess.sessionId,
              style: {
                ...(attended ? s.checkmark : s.dash),
                width: colWidth,
              },
            },
            attended ? '\u2713' : '\u2014'
          )
        })
      )
    )
  )
}

// ════════════════════════════════════════════
//  Document builder
// ════════════════════════════════════════════

/**
 * Assembles the complete @react-pdf/renderer Document element tree for a semester report.
 *
 * Structure: cover page → table of contents → one Page per present report section.
 * Sections are rendered in a fixed order regardless of insertion order in report.content.
 * Any section key absent from report.content is skipped (its renderer returns null).
 */
/**
 * Assembles the complete `Document` element tree for a semester report using `@react-pdf/renderer` components.
 *
 * Why it is used:
 * This is the core function responsible for orchestrating the entire PDF report generation. It brings together all the individual section renderers and structural components (cover, TOC, footer) into a single, cohesive document, ensuring correct ordering and inclusion of only requested sections.
 *
 * Important implementation details:
 * It takes a `SemesterReport` object as input and dynamically determines which sections to include based on the presence of data in `report.content`. Sections are rendered in a predefined logical order, not necessarily the order they appear in the `report.content` object. It constructs a cover page, a table of contents (TOC), and then iterates through the included sections, creating a new `Page` for each and injecting the appropriate section renderer. A `PageFooter` is added to every page.
 */
function buildDocument(report: SemesterReport) {
  const content = report.content
  const config = content.config
  const title = config.title || report.title

  // Determine which sections are present and included
  const sectionKeys = [
    'executive_summary',
    'semester_at_a_glance',
    'session_summaries',
    'theme_evolution',
    'student_engagement',
    'student_growth',
    'question_quality',
    'blind_spots',
    'speaker_effectiveness',
    'appendix_roster',
  ] as const

  type SectionKey = (typeof sectionKeys)[number]

  const includedSections = sectionKeys.filter(
    (key) => content[key as keyof ReportContent] !== undefined
  )

  // Date range string
  const dateRange = config.dateRange
    ? `${fmtDate(config.dateRange.start)} \u2013 ${fmtDate(config.dateRange.end)}`
    : ''

  // ── Cover page ──
  const coverPage = React.createElement(
    Page,
    { size: 'LETTER', style: s.coverPage },
    React.createElement(View, { style: s.coverAccent }),
    React.createElement(Text, { style: s.coverTitle }, title),
    dateRange
      ? React.createElement(Text, { style: s.coverSubtitle }, dateRange)
      : null,
    React.createElement(
      Text,
      { style: s.coverDate },
      `Generated ${fmtDate(content.generatedAt)}`
    ),
    React.createElement(Text, { style: s.coverBrand }, 'MGMT 305'),
    React.createElement(PageFooter, { title })
  )

  // ── Table of contents ──
  const tocPage = React.createElement(
    Page,
    { size: 'LETTER', style: s.page },
    React.createElement(Text, { style: s.tocTitle }, 'Table of Contents'),
    ...includedSections.map((key, i) =>
      React.createElement(
        View,
        { key, style: s.tocRow },
        React.createElement(Text, { style: s.tocNumber }, `${i + 1}.`),
        React.createElement(Text, { style: s.tocLabel }, SECTION_LABELS[key] || key)
      )
    ),
    config.customNotes
      ? React.createElement(
          View,
          { style: { marginTop: 24 } },
          React.createElement(
            Text,
            { style: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 6, color: MUTED_TEXT } },
            'Notes'
          ),
          React.createElement(
            Text,
            { style: { fontSize: 10, color: MUTED_TEXT, lineHeight: 1.6 } },
            config.customNotes
          )
        )
      : null,
    React.createElement(PageFooter, { title })
  )

  // ── Section renderer map ──
  const renderers: Record<string, React.ReactElement | null> = {
    executive_summary: content.executive_summary
      ? React.createElement(ExecutiveSummary, { data: content.executive_summary })
      : null,
    semester_at_a_glance: content.semester_at_a_glance
      ? React.createElement(SemesterGlance, { data: content.semester_at_a_glance })
      : null,
    session_summaries: content.session_summaries
      ? React.createElement(SessionSummaries, { data: content.session_summaries })
      : null,
    theme_evolution: content.theme_evolution
      ? React.createElement(ThemeEvolution, { data: content.theme_evolution })
      : null,
    student_engagement: content.student_engagement
      ? React.createElement(StudentEngagement, { data: content.student_engagement })
      : null,
    student_growth: content.student_growth
      ? React.createElement(StudentGrowth, { data: content.student_growth })
      : null,
    question_quality: content.question_quality
      ? React.createElement(QuestionQuality, { data: content.question_quality })
      : null,
    blind_spots: content.blind_spots
      ? React.createElement(BlindSpots, { data: content.blind_spots })
      : null,
    speaker_effectiveness: content.speaker_effectiveness
      ? React.createElement(SpeakerEffectiveness, { data: content.speaker_effectiveness })
      : null,
    appendix_roster: content.appendix_roster
      ? React.createElement(AppendixRoster, { data: content.appendix_roster })
      : null,
  }

  // ── Build section pages ──
  const sectionPages = includedSections
    .map((key) => {
      const rendered = renderers[key]
      if (!rendered) return null
      return React.createElement(
        Page,
        { key, size: 'LETTER', style: s.page },
        rendered,
        React.createElement(PageFooter, { title })
      )
    })
    .filter(Boolean)

  return React.createElement(Document, null, coverPage, tocPage, ...sectionPages)
}

// ════════════════════════════════════════════
//  Public API
// ════════════════════════════════════════════

/**
 * Generates a branded PDF buffer for a semester report.
 *
 * @param report - Full SemesterReport object including content sections and config.
 * @returns      - PDF as a Uint8Array, ready to stream as application/pdf.
 *
 * @usedBy app/api/reports/[id]/download/route.ts (?format=pdf)
 */
/**
 * This is the primary public API function for generating a PDF report. It takes a `SemesterReport` object, constructs the PDF document, and renders it into a `Uint8Array` buffer.
 *
 * Why it is used:
 * It provides a clean, asynchronous interface for external modules (e.g., API endpoints) to request and receive a complete PDF document ready for streaming or saving. It encapsulates the complexities of React PDF rendering.
 *
 * Important implementation details:
 * It internally calls `buildDocument` to create the React PDF element tree. It then uses `renderToBuffer` from `@react-pdf/renderer` to convert this React tree into a binary buffer, which is returned as a `Uint8Array`. This `Uint8Array` can be directly sent as an `application/pdf` response from a server. It is explicitly marked for use by `app/api/reports/[id]/download/route.ts` when the `format` query parameter is `pdf`.
 */
export async function generateReportPDF(report: SemesterReport): Promise<Uint8Array> {
  const doc = buildDocument(report)
  const buffer = await renderToBuffer(doc)
  return new Uint8Array(buffer)
}
