import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
} from 'docx'
import type {
  SemesterReport,
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

// ── Helpers ──

const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
} as const

const BORDER_THIN = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
} as const

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 28 })],
    spacing: { before: 360, after: 200 },
  })
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 24 })],
    spacing: { before: 240, after: 120 },
  })
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20 })],
    spacing: { after: 120 },
  })
}

function bulletItem(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20 })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  })
}

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18 })],
        alignment: AlignmentType.LEFT,
      }),
    ],
    borders: BORDER_THIN,
    shading: { fill: 'F2F2F2' },
  })
}

function dataCell(text: string, alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18 })],
        alignment,
      }),
    ],
    borders: BORDER_THIN,
  })
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

// ── Section renderers ──

function renderExecutiveSummary(section: ExecutiveSummarySection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  elements.push(sectionHeading('Executive Summary'))
  elements.push(bodyText(section.narrative))

  if (section.highlights.length > 0) {
    elements.push(subHeading('Highlights'))
    for (const h of section.highlights) {
      elements.push(bulletItem(h))
    }
  }

  const m = section.keyMetrics
  elements.push(subHeading('Key Metrics'))
  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [headerCell('Metric'), headerCell('Value')],
        }),
        new TableRow({
          children: [dataCell('Total Sessions'), dataCell(String(m.totalSessions), AlignmentType.RIGHT)],
        }),
        new TableRow({
          children: [dataCell('Total Submissions'), dataCell(String(m.totalSubmissions), AlignmentType.RIGHT)],
        }),
        new TableRow({
          children: [dataCell('Total Students'), dataCell(String(m.totalStudents), AlignmentType.RIGHT)],
        }),
        new TableRow({
          children: [
            dataCell('Avg Submissions / Session'),
            dataCell(m.avgSubmissionsPerSession.toFixed(1), AlignmentType.RIGHT),
          ],
        }),
        new TableRow({
          children: [
            dataCell('Participation Rate'),
            dataCell(formatPercent(m.participationRate), AlignmentType.RIGHT),
          ],
        }),
      ],
    }),
  )

  return elements
}

function renderSemesterGlance(section: SemesterGlanceSection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  elements.push(sectionHeading('Semester at a Glance'))

  // Summary stats table
  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [headerCell('Metric'), headerCell('Value')],
        }),
        new TableRow({
          children: [dataCell('Total Sessions'), dataCell(String(section.totalSessions), AlignmentType.RIGHT)],
        }),
        new TableRow({
          children: [dataCell('Total Submissions'), dataCell(String(section.totalSubmissions), AlignmentType.RIGHT)],
        }),
        new TableRow({
          children: [dataCell('Total Students'), dataCell(String(section.totalStudents), AlignmentType.RIGHT)],
        }),
        new TableRow({
          children: [
            dataCell('Avg Submissions / Session'),
            dataCell(section.avgSubmissionsPerSession.toFixed(1), AlignmentType.RIGHT),
          ],
        }),
      ],
    }),
  )

  // Sessions over time
  if (section.sessionsOverTime.length > 0) {
    elements.push(subHeading('Sessions Over Time'))
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [headerCell('Speaker'), headerCell('Date'), headerCell('Submissions')],
          }),
          ...section.sessionsOverTime.map(
            (s) =>
              new TableRow({
                children: [
                  dataCell(s.speakerName),
                  dataCell(formatDate(s.date)),
                  dataCell(String(s.submissionCount), AlignmentType.RIGHT),
                ],
              }),
          ),
        ],
      }),
    )
  }

  // Tier distribution
  const tierEntries = Object.entries(section.tierDistribution)
  if (tierEntries.length > 0) {
    elements.push(subHeading('Tier Distribution'))
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [headerCell('Tier'), headerCell('Count')],
          }),
          ...tierEntries.map(
            ([tier, count]) =>
              new TableRow({
                children: [dataCell(tier), dataCell(String(count), AlignmentType.RIGHT)],
              }),
          ),
        ],
      }),
    )
  }

  return elements
}

function renderSessionSummaries(section: SessionSummariesSection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  elements.push(sectionHeading('Session Summaries'))

  if (section.sessions.length === 0) {
    elements.push(bodyText('No sessions recorded.'))
    return elements
  }

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell('#'),
            headerCell('Speaker'),
            headerCell('Date'),
            headerCell('Themes'),
            headerCell('Submissions'),
            headerCell('Rating'),
          ],
        }),
        ...section.sessions.map(
          (s, i) =>
            new TableRow({
              children: [
                dataCell(String(i + 1), AlignmentType.CENTER),
                dataCell(s.speakerName),
                dataCell(formatDate(s.date)),
                dataCell(s.themes.join(', ')),
                dataCell(String(s.fileCount), AlignmentType.RIGHT),
                dataCell(s.debriefRating != null ? s.debriefRating.toFixed(1) : '—', AlignmentType.CENTER),
              ],
            }),
        ),
      ],
    }),
  )

  return elements
}

function renderThemeEvolution(section: ThemeEvolutionSection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  elements.push(sectionHeading('Theme Evolution'))
  elements.push(bodyText(section.narrative))

  if (section.dominantThemes.length > 0) {
    elements.push(subHeading('Dominant Themes'))
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell('Theme'),
              headerCell('Occurrences'),
              headerCell('First Seen'),
              headerCell('Last Seen'),
            ],
          }),
          ...section.dominantThemes.map(
            (t) =>
              new TableRow({
                children: [
                  dataCell(t.title),
                  dataCell(String(t.totalCount), AlignmentType.RIGHT),
                  dataCell(formatDate(t.firstSeen)),
                  dataCell(formatDate(t.lastSeen)),
                ],
              }),
          ),
        ],
      }),
    )
  }

  if (section.timeline.length > 0) {
    elements.push(subHeading('Theme Timeline'))
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [headerCell('Speaker'), headerCell('Date'), headerCell('Themes')],
          }),
          ...section.timeline.map(
            (t) =>
              new TableRow({
                children: [
                  dataCell(t.speakerName),
                  dataCell(formatDate(t.date)),
                  dataCell(t.themes.join(', ')),
                ],
              }),
          ),
        ],
      }),
    )
  }

  return elements
}

function renderStudentEngagement(section: StudentEngagementSection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  elements.push(sectionHeading('Student Engagement'))

  // Participation tiers
  elements.push(subHeading('Participation Tiers'))
  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [headerCell('Tier'), headerCell('Students')],
        }),
        new TableRow({
          children: [dataCell('High (80%+)'), dataCell(String(section.participationTiers.high), AlignmentType.RIGHT)],
        }),
        new TableRow({
          children: [
            dataCell('Medium (50–80%)'),
            dataCell(String(section.participationTiers.medium), AlignmentType.RIGHT),
          ],
        }),
        new TableRow({
          children: [dataCell('Low (<50%)'), dataCell(String(section.participationTiers.low), AlignmentType.RIGHT)],
        }),
      ],
    }),
  )

  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Total students: ${section.totalStudents}`,
          size: 20,
          italics: true,
        }),
      ],
      spacing: { before: 80, after: 120 },
    }),
  )

  // Top contributors
  if (section.topContributors.length > 0) {
    elements.push(subHeading('Top Contributors'))
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell('Student'),
              headerCell('Sessions'),
              headerCell('Total'),
              headerCell('Rate'),
            ],
          }),
          ...section.topContributors.map(
            (c) =>
              new TableRow({
                children: [
                  dataCell(c.studentName),
                  dataCell(String(c.sessionCount), AlignmentType.RIGHT),
                  dataCell(String(c.totalSessions), AlignmentType.RIGHT),
                  dataCell(formatPercent(c.rate), AlignmentType.RIGHT),
                ],
              }),
          ),
        ],
      }),
    )
  }

  // Dropoff
  if (section.dropoff.length > 0) {
    elements.push(subHeading('Drop-off'))
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [headerCell('Student'), headerCell('Last Seen Speaker'), headerCell('Last Seen Date')],
          }),
          ...section.dropoff.map(
            (d) =>
              new TableRow({
                children: [
                  dataCell(d.studentName),
                  dataCell(d.lastSeenSpeaker),
                  dataCell(formatDate(d.lastSeenDate)),
                ],
              }),
          ),
        ],
      }),
    )
  }

  return elements
}

function renderStudentGrowth(section: StudentGrowthSection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  elements.push(sectionHeading('Student Growth'))
  elements.push(bodyText(section.narrative))

  if (section.highlights.length > 0) {
    elements.push(subHeading('Notable Highlights'))
    for (const h of section.highlights) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({ text: h.studentName, bold: true, size: 20 }),
            new TextRun({
              text: ` (${h.sessionsParticipated} sessions)`,
              size: 20,
              italics: true,
            }),
          ],
          spacing: { before: 80, after: 40 },
        }),
      )
      elements.push(bodyText(h.narrative))
    }
  }

  return elements
}

function renderQuestionQuality(section: QuestionQualitySection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  elements.push(sectionHeading('Question Quality'))
  elements.push(bodyText(section.narrative))

  const trendLabel =
    section.trend === 'improving'
      ? 'Trend: Improving'
      : section.trend === 'declining'
        ? 'Trend: Declining'
        : 'Trend: Stable'

  elements.push(
    new Paragraph({
      children: [
        new TextRun({ text: trendLabel, bold: true, size: 20, italics: true }),
      ],
      spacing: { after: 120 },
    }),
  )

  // Overall distribution
  const overallEntries = Object.entries(section.overallDistribution)
  if (overallEntries.length > 0) {
    elements.push(subHeading('Overall Distribution'))
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [headerCell('Tier'), headerCell('Count')],
          }),
          ...overallEntries.map(
            ([tier, count]) =>
              new TableRow({
                children: [dataCell(tier), dataCell(String(count), AlignmentType.RIGHT)],
              }),
          ),
        ],
      }),
    )
  }

  // Per-session tiers
  if (section.perSessionTiers.length > 0) {
    elements.push(subHeading('Per-Session Tier Breakdown'))

    // Collect all tier names across sessions
    const allTiers = new Set<string>()
    for (const ps of section.perSessionTiers) {
      for (const t of Object.keys(ps.tierCounts)) allTiers.add(t)
    }
    const tierNames = Array.from(allTiers).sort()

    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell('Speaker'),
              headerCell('Date'),
              ...tierNames.map((t) => headerCell(t)),
            ],
          }),
          ...section.perSessionTiers.map(
            (ps) =>
              new TableRow({
                children: [
                  dataCell(ps.speakerName),
                  dataCell(formatDate(ps.date)),
                  ...tierNames.map((t) =>
                    dataCell(String(ps.tierCounts[t] ?? 0), AlignmentType.RIGHT),
                  ),
                ],
              }),
          ),
        ],
      }),
    )
  }

  return elements
}

function renderBlindSpots(section: BlindSpotsSection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  elements.push(sectionHeading('Blind Spots'))

  if (section.blindSpots.length > 0) {
    elements.push(subHeading('Identified Blind Spots'))
    for (const bs of section.blindSpots) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: bs.title, bold: true, size: 20 })],
          spacing: { before: 80, after: 40 },
        }),
      )
      elements.push(bodyText(bs.description))
    }
  }

  if (section.recommendations.length > 0) {
    elements.push(subHeading('Recommendations'))
    for (const r of section.recommendations) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: r.text, bold: true, size: 20 })],
          spacing: { before: 80, after: 40 },
        }),
      )
      elements.push(bodyText(r.reason))
    }
  }

  return elements
}

function renderSpeakerEffectiveness(section: SpeakerEffectivenessSection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  elements.push(sectionHeading('Speaker Effectiveness'))
  elements.push(bodyText(section.narrative))

  if (section.rankings.length > 0) {
    elements.push(subHeading('Rankings'))
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell('#'),
              headerCell('Speaker'),
              headerCell('Date'),
              headerCell('Rating'),
              headerCell('Avg Tier'),
              headerCell('Submissions'),
            ],
          }),
          ...section.rankings.map(
            (r, i) =>
              new TableRow({
                children: [
                  dataCell(String(i + 1), AlignmentType.CENTER),
                  dataCell(r.speakerName),
                  dataCell(formatDate(r.date)),
                  dataCell(r.debriefRating != null ? r.debriefRating.toFixed(1) : '—', AlignmentType.CENTER),
                  dataCell(r.avgTier != null ? r.avgTier.toFixed(2) : '—', AlignmentType.CENTER),
                  dataCell(String(r.submissionCount), AlignmentType.RIGHT),
                ],
              }),
          ),
        ],
      }),
    )
  }

  return elements
}

function renderAppendixRoster(section: AppendixRosterSection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  elements.push(sectionHeading('Appendix: Full Roster'))

  if (section.students.length === 0) {
    elements.push(bodyText('No student data available.'))
    return elements
  }

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell('Student'),
            headerCell('Sessions Attended'),
            headerCell('Total Sessions'),
            headerCell('Participation Rate'),
          ],
        }),
        ...section.students.map(
          (s) =>
            new TableRow({
              children: [
                dataCell(s.studentName),
                dataCell(String(s.sessionsAttended.length), AlignmentType.RIGHT),
                dataCell(String(s.totalSessions), AlignmentType.RIGHT),
                dataCell(formatPercent(s.participationRate), AlignmentType.RIGHT),
              ],
            }),
        ),
      ],
    }),
  )

  return elements
}

// ── Title page elements ──

function buildTitlePage(report: SemesterReport): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  // Title
  elements.push(
    new Paragraph({
      children: [new TextRun({ text: 'MGMT 305', bold: true, size: 36 })],
      spacing: { after: 80 },
      alignment: AlignmentType.CENTER,
    }),
  )

  elements.push(
    new Paragraph({
      children: [new TextRun({ text: report.title, size: 28 })],
      spacing: { after: 120 },
      alignment: AlignmentType.CENTER,
    }),
  )

  // Date range
  if (report.config.dateRange) {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${formatDate(report.config.dateRange.start)} — ${formatDate(report.config.dateRange.end)}`,
            size: 20,
            italics: true,
          }),
        ],
        spacing: { after: 80 },
        alignment: AlignmentType.CENTER,
      }),
    )
  }

  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated ${formatDate(report.content.generatedAt)}`,
          size: 18,
          italics: true,
        }),
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
    }),
  )

  return elements
}

// ── Main export ──

export async function generateReportDocx(report: SemesterReport): Promise<Uint8Array> {
  const children: (Paragraph | Table)[] = []

  // Title page
  children.push(...buildTitlePage(report))

  const c = report.content

  // Render each section if present
  if (c.executive_summary) {
    children.push(...renderExecutiveSummary(c.executive_summary))
  }

  if (c.semester_at_a_glance) {
    children.push(...renderSemesterGlance(c.semester_at_a_glance))
  }

  if (c.session_summaries) {
    children.push(...renderSessionSummaries(c.session_summaries))
  }

  if (c.theme_evolution) {
    children.push(...renderThemeEvolution(c.theme_evolution))
  }

  if (c.student_engagement) {
    children.push(...renderStudentEngagement(c.student_engagement))
  }

  if (c.student_growth) {
    children.push(...renderStudentGrowth(c.student_growth))
  }

  if (c.question_quality) {
    children.push(...renderQuestionQuality(c.question_quality))
  }

  if (c.blind_spots) {
    children.push(...renderBlindSpots(c.blind_spots))
  }

  if (c.speaker_effectiveness) {
    children.push(...renderSpeakerEffectiveness(c.speaker_effectiveness))
  }

  if (c.appendix_roster) {
    children.push(...renderAppendixRoster(c.appendix_roster))
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  })

  const buffer = await Packer.toBuffer(doc)
  return new Uint8Array(buffer)
}
