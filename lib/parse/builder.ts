import { extractZip, ZipEntry } from './unzip'
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
