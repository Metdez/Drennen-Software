import { extractZip } from './unzip'
import { parsePdf } from './pdf'
import { parseDocx } from './docx'

export interface ParsedSubmission {
  studentName: string // "Sarah M."
  filename: string
  text: string
}

function extractStudentName(filename: string): string {
  // Get just the base filename without path
  const base = filename.split('/').pop() ?? filename
  const parts = base.split('_')

  if (parts.length < 2) return 'Unknown Student'

  const firstName = parts[0]
  const lastInitial = parts[1].charAt(0).toUpperCase()

  return `${firstName} ${lastInitial}.`
}

export async function buildSubmissionsText(zipBuffer: Buffer): Promise<{
  text: string
  fileCount: number
}> {
  const entries = await extractZip(zipBuffer)

  const submissions: ParsedSubmission[] = []

  for (const entry of entries) {
    let text = ''

    if (entry.extension === 'pdf') {
      text = await parsePdf(entry.buffer)
    } else if (entry.extension === 'docx') {
      text = await parseDocx(entry.buffer)
    }

    if (!text.trim()) continue // skip empty/failed files

    submissions.push({
      studentName: extractStudentName(entry.filename),
      filename: entry.filename,
      text: text.trim(),
    })
  }

  // Build the formatted string for the AI
  const sections = submissions.map(sub =>
    `---\nSTUDENT: ${sub.studentName}\nFILE: ${sub.filename}\n\n${sub.text}`
  )

  return {
    text: sections.join('\n\n'),
    fileCount: submissions.length,
  }
}
