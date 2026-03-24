# AGENT-FILE.md — Agent 07: File Processing Pipeline
# Wave 2 agent. Fires after Wave 1 is merged.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md (especially GOTCHA-004 and GOTCHA-007)
4. TYPES.md
5. PROMPT.md ← read the "USER MESSAGE FORMAT" section to understand what your output feeds into

---

## YOUR JOB

Build the complete file processing pipeline that takes a ZIP buffer and returns a single formatted string ready to send to the AI. You own these files and ONLY these files:

```
lib/parse/unzip.ts
lib/parse/pdf.ts
lib/parse/docx.ts
lib/parse/builder.ts
```

---

## HOW THE PIPELINE WORKS

```
ZIP Buffer (from request)
    ↓
unzip.ts → array of { filename, buffer, extension }
    ↓
For each file:
  .pdf → pdf.ts → text string
  .docx → docx.ts → text string
  anything else → skip
    ↓
builder.ts → one formatted string with student attribution
    ↓
Returned to app/api/process/route.ts
```

---

## FILE 1: lib/parse/unzip.ts

```ts
import unzipper from 'unzipper'

interface ZipEntry {
  filename: string
  buffer: Buffer
  extension: string
}

export async function extractZip(zipBuffer: Buffer): Promise<ZipEntry[]> {
  const directory = await unzipper.Open.buffer(zipBuffer)

  const entries: ZipEntry[] = []

  for (const file of directory.files) {
    // Skip Mac junk files and directories
    if (file.path.startsWith('__MACOSX') || file.path.endsWith('/')) continue

    const ext = file.path.split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'docx'].includes(ext)) continue

    const buffer = await file.buffer()
    entries.push({
      filename: file.path,
      buffer,
      extension: ext,
    })
  }

  return entries
}
```

---

## FILE 2: lib/parse/pdf.ts

```ts
import pdfParse from 'pdf-parse'

export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const result = await pdfParse(buffer)
    return result.text.trim()
  } catch {
    return '' // If a file fails to parse, return empty — don't crash the whole batch
  }
}
```

---

## FILE 3: lib/parse/docx.ts

```ts
import mammoth from 'mammoth'

export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  } catch {
    return '' // If a file fails to parse, return empty — don't crash the whole batch
  }
}
```

---

## FILE 4: lib/parse/builder.ts

This is the most important file in the pipeline. It extracts the student's name from the filename, parses each file, and assembles everything into one formatted string.

**Canvas filename format:**
Canvas exports student files as: `FirstName_LastName_AssignmentTitle_timestamp.pdf`
Example: `Sarah_Martinez_GuestSpeakerQuestions_1710000000_1.pdf`

Extract: first segment = first name, second segment = last name initial.

```ts
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
```

---

## COMPLETION CHECKLIST

- [ ] `lib/parse/unzip.ts` — extracts ZIP, filters junk files, returns array of entries
- [ ] `lib/parse/pdf.ts` — parses PDF buffer to text, fails gracefully
- [ ] `lib/parse/docx.ts` — parses DOCX buffer to text, fails gracefully
- [ ] `lib/parse/builder.ts` — orchestrates full pipeline, returns `{ text, fileCount }`
- [ ] Student name extraction handles the Canvas filename format
- [ ] Empty/failed files are skipped without crashing the batch
- [ ] `__MACOSX` files and directories are filtered out
- [ ] `npx tsc --noEmit` passes with zero errors
