/**
 * @file builder.ts
 * Orchestration entry point for the ZIP → parse → structured text pipeline.
 *
 * Called by: app/api/process/route.ts
 * Uses: lib/parse/unzip.ts, lib/parse/pdf.ts, lib/parse/docx.ts
 *
 * Flow:
 *   1. extractZip()   — open the professor's uploaded Canvas ZIP, filter to PDF/DOCX entries
 *   2. processInChunks() — parse each file in batches of 5 (avoid overwhelming memory)
 *   3. extractStudentName() — derive display name ("Sarah M.") from Canvas filename conventions
 *   4. formatSubmissionsForAi() — concatenate all submission text into the structured string
 *                                 that gets passed to the xAI model in lib/ai/
 *
 * Error handling: individual file parse failures return null (not thrown); they are filtered
 * out before the final result. A class with 30 students continues even if 1–2 files fail.
 */

import { extractZip, ZipEntry } from './unzip'
import { parsePdf } from './pdf'
import { parseDocx } from './docx'
import { parseHtml } from './html'

/** A single student's parsed submission, ready for AI processing. */
/**
 * A single student's parsed submission, ready for AI processing.
 *
 * What it does: Defines a standardized structure for representing a single student's parsed submission data.
 * Why it is used: This interface ensures consistency in how parsed submission data is handled throughout the application, particularly when preparing it for AI processing or storage.
 * Important implementation details: It includes `studentName` (e.g., "Sarah M."), `filename` (the original submission filename), and `text` (the extracted textual content of the submission).
 */
export interface ParsedSubmission {
  studentName: string // "Sarah M."
  filename: string
  text: string
}

/**
 * Serializes an array of parsed submissions into the delimiter-separated string
 * format expected by the xAI system prompt in lib/ai/prompt.ts.
 *
 * Each submission block looks like:
 * ```
 * ---
 * STUDENT: Sarah M.
 * FILE: Smith_Sarah_12345_attempt_submission.pdf
 *
 * <submission text>
 * ```
 */
/**
 * Serializes an array of parsed submissions into a specific delimiter-separated string format.
 *
 * What it does: Transforms an array of `ParsedSubmission` objects into a single string formatted precisely as expected by the xAI system prompt (located in `lib/ai/prompt.ts`).
 * Why it is used: The AI system requires all submissions for a single prompt to be concatenated into one large string, with each submission clearly delimited and metadata provided, to facilitate its processing.
 * Important implementation details: Each submission block starts with `---\nSTUDENT: <studentName>\nFILE: <filename>\n\n<submission text>`, and individual submission blocks are separated by two newline characters (`\n\n`).
 */
export function formatSubmissionsForAi(
  submissions: Array<{ studentName: string; filename: string; text: string }>
): string {
  return submissions
    .map((sub) => `---\nSTUDENT: ${sub.studentName}\nFILE: ${sub.filename}\n\n${sub.text}`)
    .join('\n\n')
}

/** Title-cases the first character of a string and lowercases the rest. */
/**
 * Title-cases the first character of a string and lowercases the rest.
 *
 * What it does: Converts the input string such that its first character is capitalized, and all subsequent characters are lowercased.
 * Why it is used: To ensure consistent capitalization for names extracted from filenames, providing a cleaner and more standardized display name.
 * Important implementation details: It handles single-character strings and correctly processes strings with mixed casing. It implicitly handles empty strings gracefully by returning an empty string.
 */
function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

/**
 * Splits a concatenated Canvas name segment like "HannaZack" into first/last parts.
 *
 * Canvas sometimes concatenates LastnameFirstname without separators. This function
 * uses a lookbehind regex to split on lowercase→uppercase transitions.
 * Example: "HannaZack" → { firstName: "Zack", lastName: "Hanna" }
 */
/**
 * Splits a concatenated Canvas name segment like "HannaZack" into first/last parts.
 *
 * What it does: Analyzes a string segment, assuming it might be a camel-cased concatenation of 'LastnameFirstname' from Canvas, and attempts to separate it into distinct `firstName` and `lastName` components.
 * Why it is used: Canvas sometimes exports filenames with student names concatenated (e.g., `LastnameFirstname_StudentID`), requiring a specific parsing strategy to correctly identify the first and last names.
 * Important implementation details: It uses a lookbehind regex `/(?<=[a-z])(?=[A-Z])/` to find transitions from a lowercase letter to an uppercase letter, indicating a potential split point. It assumes the Canvas format `LastnameFirstname`, meaning the last segment after splitting is the first name. If no split occurs, the entire segment is treated as the first name with an empty last name.
 */
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

/**
 * Derives a display name ("First L.") from a Canvas submission filename.
 *
 * Canvas exports files in one of three naming conventions:
 *   - Format A: `Lastname_Firstname_StudentID_…`  (explicit underscore-separated names)
 *   - Format B: `LastnameFirstname_StudentID_…`   (concatenated, numeric second segment)
 *   - Format C: Same as B but with an extra `_LATE_` segment injected by Canvas for late submissions
 *
 * Returns "Unknown Student" if the filename cannot be parsed.
 */
/**
 * Derives a display name ("First L.") from a Canvas submission filename.
 *
 * What it does: Parses a given filename string to extract and format a student's display name (e.g., "Sarah M.") based on common Canvas naming conventions.
 * Why it is used: Student names in Canvas filenames can follow various patterns, and this function centralizes the logic to consistently extract and present them in a user-friendly and standardized format for display and AI processing.
 * Important implementation details: It handles three primary Canvas filename formats:
 *   1. `Lastname_Firstname_StudentID_…`
 *   2. `LastnameFirstname_StudentID_…`
 *   3. Same as 2, but with an injected `_LATE_` segment.
 * It filters out the `_LATE_` marker and uses `toTitleCase` and `splitCamelCaseName` internally. If the filename cannot be parsed into a recognizable student name, it defaults to "Unknown Student". The function first extracts the base filename by removing any path components.
 */
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

/**
 * Processes an array of items in fixed-size batches, running `fn` concurrently
 * within each batch.
 *
 * Used to cap concurrent PDF/DOCX parse calls at 5 to avoid memory spikes
 * when a professor uploads a class of 30+ students.
 */
/**
 * Processes an array of items in fixed-size batches, running `fn` concurrently within each batch.
 *
 * What it does: Iterates through a given array of items, dividing them into smaller chunks, and executes an asynchronous processing function (`fn`) on all items within each chunk concurrently using `Promise.all`.
 * Why it is used: To manage resource consumption (e.g., memory, CPU) when dealing with a large number of asynchronous operations. This prevents the system from being overwhelmed by too many concurrent tasks, especially critical for memory-intensive operations like PDF/DOCX parsing.
 * Important implementation details: It collects results from each chunk and appends them to a single results array. The `chunkSize` parameter dictates how many `fn` calls will run in parallel at any given time.
 */
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

/**
 * Top-level parse orchestrator. Accepts a raw ZIP buffer and returns:
 * - `text`        — the full AI-ready submission string (passed to xAI)
 * - `fileCount`   — number of successfully parsed files (saved to sessions.file_count)
 * - `submissions` — structured array used to populate student_submissions rows
 *
 * Individual parse failures are silently dropped (null-filtered); processing
 * continues for the rest of the ZIP.
 */
/**
 * Top-level parse orchestrator.
 *
 * What it does: Acts as the main entry point for processing a raw ZIP buffer containing multiple student submissions. It orchestrates the extraction, parsing, name derivation, and formatting of these submissions.
 * Why it is used: This function is the core logic for transforming an uploaded Canvas ZIP file into a structured set of `ParsedSubmission` objects and a single, AI-ready text string, making it central to the application's workflow.
 * Important implementation details: 
 *   1. It first extracts all files from the `zipBuffer` using `extractZip`.
 *   2. It then uses `processInChunks` to parse individual files (PDFs via `parsePdf` or DOCXs via `parseDocx`) with a concurrency limit of 5 to mitigate memory spikes.
 *   3. For each successfully parsed file, it extracts the student's name using `extractStudentName`.
 *   4. Submissions with empty or whitespace-only text content are silently dropped.
 *   5. Finally, it formats all successfully parsed submissions into the AI-expected string format using `formatSubmissionsForAi`.
 *   6. It returns an object containing the combined `text` for AI, the `fileCount` of successfully parsed submissions, and the array of `submissions` (structured `ParsedSubmission` objects).
 */
export async function buildSubmissionsText(zipBuffer: Buffer): Promise<{
  text: string
  fileCount: number
  submissions: ParsedSubmission[]
}> {
  const entries = await extractZip(zipBuffer)

  const results = await processInChunks<ZipEntry, ParsedSubmission | null>(
    entries,
    5, // parse at most 5 files concurrently
    async (entry) => {
      let text: string
      if (entry.extension === 'pdf') {
        text = await parsePdf(entry.buffer)
      } else if (entry.extension === 'docx') {
        text = await parseDocx(entry.buffer)
      } else {
        // 'html' | 'htm' — Canvas text-entry submissions
        text = await parseHtml(entry.buffer)
      }
      if (!text.trim()) return null
      return {
        studentName: extractStudentName(entry.filename),
        filename: entry.filename,
        text: text.trim(),
      }
    }
  )
  const submissions = results.filter((s): s is ParsedSubmission => s !== null)

  return {
    text: formatSubmissionsForAi(submissions),
    fileCount: submissions.length,
    submissions,
  }
}
