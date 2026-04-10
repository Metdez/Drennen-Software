# lib/parse — Parse Pipeline

## Purpose

Converts a professor's Canvas submission ZIP archive into the structured text string
that gets passed to the xAI model in `lib/ai/`. Each file in this directory handles
one discrete step of the pipeline.

## Pipeline flow

```
app/api/process/route.ts
        │
        ▼
builder.ts (buildSubmissionsText)
        │
        ├── unzip.ts (extractZip)
        │       └── returns ZipEntry[] — one entry per PDF/DOCX/HTML file
        │
        ├── pdf.ts (parsePdf)       — called for each .pdf entry
        ├── docx.ts (parseDocx)     — called for each .docx entry
        ├── html.ts (parseHtml)     — called for each .html/.htm entry
        │
        └── formatSubmissionsForAi  — assembles the final AI prompt string
```

The orchestrator (`builder.ts`) processes files in batches of 5 concurrently to
cap memory usage for large classes.

## Files

| File | Exports | Purpose |
|------|---------|---------|
| `builder.ts` | `buildSubmissionsText()`, `formatSubmissionsForAi()`, `ParsedSubmission` | Pipeline entry point. Orchestrates unzip → parse → name extraction → format. Called by `app/api/process/route.ts`. |
| `unzip.ts` | `extractZip()`, `ZipEntry` | Opens the ZIP buffer in memory, skips `__MACOSX` junk and directories, returns only PDF/DOCX/HTML entries. |
| `pdf.ts` | `parsePdf()` | Extracts plain text from a PDF buffer using `pdf-parse`. Returns empty string on failure. |
| `docx.ts` | `parseDocx()` | Extracts raw text from a DOCX buffer using `mammoth`. Returns empty string on failure. |
| `html.ts` | `parseHtml()` | Extracts plain text from an HTML buffer using `node-html-parser`. Handles Canvas text-entry submissions exported as Chrome HTML Documents. Returns empty string on failure. |
| `parseQuestions.ts` | `parseSections()`, `parseQuestionsFromOutput()`, `ParsedSection`, `ParsedQuestion` | Parses the AI markdown output into structured question data. Used by the preview UI, export renderers, and debrief panel. |
| `parseThemes.ts` | `parseThemesFromOutput()`, `themesOverlap()`, `ParsedTheme` | Extracts numbered theme titles from the AI output; computes cross-session theme overlap for the preview page badges. |

## Error handling

**Parse failures are silent and non-fatal.** `parsePdf()`, `parseDocx()`, and `parseHtml()` all catch
errors and return an empty string. `builder.ts` filters out null results (empty
submissions) after parsing. This means:

- A class of 30 students continues even if 1–2 files are corrupt or encrypted.
- The `fileCount` returned by `buildSubmissionsText()` reflects successfully parsed
  files only — not the total number of ZIP entries.
- There is intentionally no logging of individual file failures; the professor sees
  an accurate file count in the UI and can re-upload if needed.

## Canvas filename conventions

`builder.ts#extractStudentName()` handles three Canvas export filename formats:

| Format | Example | Result |
|--------|---------|--------|
| A — Lastname_Firstname_ID | `Smith_Sarah_12345_…` | `Sarah S.` |
| B — ConcatenatedLastnameFirstname_ID | `SmithSarah_12345_…` | `Sarah S.` |
| C — Same as B with LATE marker | `SmithSarah_LATE_12345_…` | `Sarah S.` |

The `_LATE_` segment (added by Canvas for late submissions) is filtered out before name parsing.

## AI output format expected by parseQuestions / parseThemes

The xAI model (via the prompt in `lib/ai/prompt.ts`) produces a 10-section markdown
format. Both parsers rely on this structure:

```markdown
***N. Theme Title***
**Primary:** Question text *(Student Name)*
**Backup:** Question text *(Student Name)*
```

If the model deviates from this format (e.g., during a custom prompt run), both parsers
return empty arrays gracefully — they do not throw.

## Conventions

- Keep `builder.ts` as the sole orchestration layer; format-specific files stay narrowly scoped.
- Parse failures must be isolated — one unreadable file must not abort the whole upload.
- Return empty string (not null/undefined/throw) for unsupported or failed inputs.
- Do not add new file format support without a corresponding filter in `unzip.ts`.
