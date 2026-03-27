export interface ParsedQuestion {
  themeTitle: string
  role: 'primary' | 'backup'
  text: string
  attribution: string
}

export interface ParsedSection {
  title: string
  primary: { label: string; text: string; attribution: string } | null
  backup: { label: string; text: string; attribution: string } | null
}

/** Parse the AI-generated markdown output into structured sections with questions. */
export function parseSections(output: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  let current: ParsedSection | null = null

  for (const raw of output.split('\n')) {
    const line = raw.trim()
    if (!line || line === '**Top Student Questions**') continue

    const titleMatch = line.match(/^\*{3}(\d+\.\s+.+?)\*{3}$/)
    if (titleMatch) {
      if (current) sections.push(current)
      current = { title: titleMatch[1], primary: null, backup: null }
      continue
    }

    const qMatch = line.match(/^\*\*(Primary|Backup):\*\*\s+(.*?)\s*\*\(([^)]+)\)\*\s*$/)
    if (qMatch && current) {
      const q = { label: qMatch[1], text: qMatch[2], attribution: qMatch[3] }
      if (q.label === 'Primary') current.primary = q
      else current.backup = q
    }
  }

  if (current) sections.push(current)
  return sections
}

/** Flatten parsed sections into a flat list of questions for the debrief form. */
export function parseQuestionsFromOutput(output: string): ParsedQuestion[] {
  const sections = parseSections(output)
  const questions: ParsedQuestion[] = []

  for (const section of sections) {
    if (section.primary) {
      questions.push({
        themeTitle: section.title,
        role: 'primary',
        text: section.primary.text,
        attribution: section.primary.attribution,
      })
    }
    if (section.backup) {
      questions.push({
        themeTitle: section.title,
        role: 'backup',
        text: section.backup.text,
        attribution: section.backup.attribution,
      })
    }
  }

  return questions
}
