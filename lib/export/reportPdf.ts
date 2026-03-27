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

const ORANGE = '#f36f21'
const PURPLE = '#542785'
const GREEN = '#0f6b37'
const LIGHT_GRAY = '#f5f5f5'
const MID_GRAY = '#e0e0e0'
const DARK_TEXT = '#1a1a1a'
const MUTED_TEXT = '#666666'

// ── Styles ──

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

// ── Helper: format date ──

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

// ── Helper: percent string ──

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

// ── Helper: truncate string ──

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 1) + '\u2026'
}

// ── SVG Bar Chart ──

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

// ── SVG Progress Bar (horizontal) ──

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

// ── Page footer component ──

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
// ════════════════════════════════════════════

// ── 1. Executive Summary ──

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

function AppendixRoster({ data }: { data: AppendixRosterSection }) {
  const sessions = data.sessionOrder
  // For wide rosters, we may need to limit columns per page
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

export async function generateReportPDF(report: SemesterReport): Promise<Uint8Array> {
  const doc = buildDocument(report)
  const buffer = await renderToBuffer(doc)
  return new Uint8Array(buffer)
}
