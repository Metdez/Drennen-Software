import type { SpeakerBriefContent } from '@/types'

export function formatBriefAsText(content: SpeakerBriefContent): string {
  const lines: string[] = []

  lines.push(`SPEAKER PREP BRIEF: ${content.header.speakerName}`)
  lines.push(`${content.header.courseLabel} — ${content.header.date}`)
  lines.push(`${content.header.studentCount} student submissions analyzed`)
  lines.push('')
  lines.push('---')
  lines.push('')

  lines.push('WHAT STUDENTS CARE ABOUT')
  lines.push(content.narrative)
  lines.push('')

  lines.push('TOP THEMES')
  for (const theme of content.topThemes) {
    lines.push(`— ${theme.title}: ${theme.description}`)
  }
  lines.push('')

  lines.push('SUGGESTED TALKING POINTS')
  content.talkingPoints.forEach((tp, i) => {
    lines.push(`${i + 1}. ${tp.point} — ${tp.rationale}`)
  })
  lines.push('')

  lines.push('CLASS CONTEXT')
  lines.push(content.classContext)
  lines.push('')

  lines.push('WHAT TO EXPECT')
  lines.push(content.whatToExpect)

  return lines.join('\n')
}
