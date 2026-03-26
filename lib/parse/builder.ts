import { extractZip, ZipEntry } from './unzip'
import { parsePdf } from './pdf'
import { parseDocx } from './docx'

export interface ParsedSubmission {
  studentName: string // "Sarah M."
  filename: string
  text: string
}

function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function splitCamelCaseName(segment: string): { firstName: string; lastName: string } {
  // Split on lowercase→uppercase transitions: "HannaZack" → ["Hanna","Zack"]
  const parts = segment.split(/(?<=[a-z])(?=[A-Z])/)
  if (parts.length < 2) return { firstName: segment, lastName: '' }
  // Canvas format is LastnameFirstname — last segment is the first name
  return {
    firstName: parts[parts.length - 1],
    lastName: parts.slice(0, -1).join(''),
  }
}

function extractStudentName(filename: string): string {
  const base = filename.split('/').pop() ?? filename
  const segments = base.split('_')

  if (segments.length < 2) return 'Unknown Student'

  // Filter out LATE marker (Canvas adds _LATE_ for late submissions)
  const parts = segments.filter(s => s.toUpperCase() !== 'LATE')
  if (parts.length < 2) return 'Unknown Student'

  // Format A: Lastname_Firstname_StudentID (underscore-separated names)
  if (!/^\d+$/.test(parts[1]) && parts.length >= 3 && /^\d+$/.test(parts[2])) {
    const firstName = toTitleCase(parts[1])
    const lastInitial = parts[0].charAt(0).toUpperCase()
    return `${firstName} ${lastInitial}.`
  }

  // Format B/C: LastnameFirstname_StudentID (concatenated, with or without LATE)
  if (/^\d+$/.test(parts[1])) {
    const { firstName, lastName } = splitCamelCaseName(parts[0])
    if (lastName) {
      return `${toTitleCase(firstName)} ${lastName.charAt(0).toUpperCase()}.`
    }
    return toTitleCase(firstName)
  }

  return toTitleCase(parts[0])
}

async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    results.push(...await Promise.all(chunk.map(fn)))
  }
  return results
}

export async function buildSubmissionsText(zipBuffer: Buffer): Promise<{
  text: string
  fileCount: number
  submissions: ParsedSubmission[]
}> {
  const entries = await extractZip(zipBuffer)

  const results = await processInChunks<ZipEntry, ParsedSubmission | null>(
    entries,
    5,
    async (entry) => {
      const text = entry.extension === 'pdf'
        ? await parsePdf(entry.buffer)
        : await parseDocx(entry.buffer)
      if (!text.trim()) return null
      return {
        studentName: extractStudentName(entry.filename),
        filename: entry.filename,
        text: text.trim(),
      }
    }
  )
  const submissions = results.filter((s): s is ParsedSubmission => s !== null)

  // Build the formatted string for the AI
  const sections = submissions.map(sub =>
    `---\nSTUDENT: ${sub.studentName}\nFILE: ${sub.filename}\n\n${sub.text}`
  )

  return {
    text: sections.join('\n\n'),
    fileCount: submissions.length,
    submissions,
  }
}
