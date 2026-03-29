# lib/export/ — Document Export

Generates downloadable PDF and DOCX files from session data.

## Libraries

- **PDF:** `@react-pdf/renderer` — React-based PDF generation
- **DOCX:** `docx` — programmatic Word document creation

## Files

| File | Purpose |
|------|---------|
| `pdf.ts` | Session output → PDF |
| `docx.ts` | Session output → DOCX |
| `briefPdf.ts` | Speaker brief → PDF |
| `briefText.ts` | Speaker brief → plain text |
| `reportPdf.ts` | Semester report → PDF |
| `reportDocx.ts` | Semester report → DOCX |
| `storyPdf.ts` | Narrative story → PDF |
| `storyDocx.ts` | Narrative story → DOCX |

## Pattern

Each export file follows the same pattern:
1. Accept typed content as input
2. Build the document structure using the library's API
3. Return a `Buffer` or stream for the API route to send as a response
