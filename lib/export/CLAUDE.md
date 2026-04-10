# lib/export/ — Document Export

Generates downloadable PDF, DOCX, and plain-text artifacts from session and semester data.

## Libraries

- `@react-pdf/renderer` — React element tree rendered to a PDF buffer server-side. All PDF files use `React.createElement` (not JSX) because they run in a Node.js API route context.
- `docx` — class-based Office Open XML builder. Returns `Buffer` or `Uint8Array`.

## Export file → document type → caller route → output format

| File | Document type | Caller route | Format | MIME type |
|------|--------------|--------------|--------|-----------|
| `pdf.ts` | Session interview sheet | `app/api/sessions/[id]/download/route.ts` (`?format=pdf`) | PDF | `application/pdf` |
| `pdf.ts` | Session interview sheet | `app/api/shared/[token]/download/route.ts` | PDF | `application/pdf` |
| `docx.ts` | Session interview sheet | `app/api/sessions/[id]/download/route.ts` (`?format=docx`) | DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `docx.ts` | Session interview sheet | `app/api/shared/[token]/download/route.ts` | DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `briefPdf.ts` | Speaker prep brief | `app/api/sessions/[id]/brief/download/route.ts` (`?format=pdf`) | PDF | `application/pdf` |
| `briefText.ts` | Speaker prep brief | `app/api/sessions/[id]/brief/download/route.ts` (`?format=text`) | Plain text | `text/plain` |
| `reportPdf.ts` | Semester report | `app/api/reports/[id]/download/route.ts` (`?format=pdf`) | PDF | `application/pdf` |
| `reportDocx.ts` | Semester report | `app/api/reports/[id]/download/route.ts` (`?format=docx`) | DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `storyPdf.ts` | Semester narrative story | `app/api/stories/[id]/download/route.ts` (`?format=pdf`) | PDF | `application/pdf` |
| `storyDocx.ts` | Semester narrative story | `app/api/stories/[id]/download/route.ts` (`?format=docx`) | DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |

## Pattern

Each export file follows the same shape:
1. Accept typed content as input (e.g. `SemesterReport`, `SpeakerBriefContent`, `SemesterStory`).
2. Build the document structure using the library API (`React.createElement` tree for PDF, `Paragraph`/`Table` array for DOCX).
3. Return a `Buffer` or `Uint8Array` for the API route to stream as an HTTP response.

## PDF conventions

- **Brand colors** are defined as local hex constants in each PDF file rather than imported from `lib/constants/brand` because `@react-pdf/renderer`'s `StyleSheet.create()` requires plain string values.
- **No JSX** — all React elements use `React.createElement()`. This avoids JSX transformer issues in the server route context.
- **SVG charts** (in `reportPdf.ts`) use `@react-pdf/renderer`'s `Svg`, `Rect`, `Line`, and `Text` primitives. No canvas or browser required.
- **Page footers** use the `fixed` prop to pin footer Views to the bottom of every page without consuming content flow space.

## DOCX conventions

- Spacing values are in **twips** (twentieths of a point). Common values: `240` = 12pt, `360` = 18pt, `1440` = 1 inch.
- `BORDER_NONE` and `BORDER_THIN` helper constants are used in `reportDocx.ts` for consistent table borders.
- `Packer.toBuffer()` returns a `Buffer`; wrap in `new Uint8Array(buffer)` when returning `Uint8Array` is required.

## Section rendering (reportPdf.ts and reportDocx.ts)

Both report export files render sections conditionally — any key absent from `report.content` is skipped. The fixed rendering order is:
`executive_summary` → `semester_at_a_glance` → `session_summaries` → `theme_evolution` → `student_engagement` → `student_growth` → `question_quality` → `blind_spots` → `speaker_effectiveness` → `appendix_roster`

## Brand colors

**Never hardcode hex values.** Define local constants at the top of each file mirroring `BRAND` from `lib/constants/brand.ts`:

```ts
// Match lib/constants/brand.ts exactly
const ORANGE = '#f36f21'  // BRAND.ORANGE
const PURPLE = '#542785'  // BRAND.PURPLE
const GREEN  = '#0f6b37'  // BRAND.GREEN
```

For `docx` `TextRun` `color`, the value must be 6-digit hex **without** the leading `#`:
```ts
new TextRun({ text, color: '542785' })  // PURPLE — no '#' prefix
```

## Return types at a glance

| Export function      | Return type           |
|----------------------|-----------------------|
| `generatePDF`        | `Promise<Buffer>`     |
| `generateDocx`       | `Promise<Buffer>`     |
| `generateReportPDF`  | `Promise<Uint8Array>` |
| `generateReportDocx` | `Promise<Uint8Array>` |
| `generateBriefPDF`   | `Promise<Buffer>`     |
| `formatBriefAsText`  | `string` (sync)       |
| `generateStoryPDF`   | `Promise<Uint8Array>` |
| `generateStoryDocx`  | `Promise<Buffer>`     |

## Anti-patterns

- **Never use JSX in PDF files.** Use `React.createElement()` — JSX is not transformed in Node.js API routes.
- **Never import `BRAND` from `lib/constants` into PDF/DOCX files.** Define local hex constants instead (see Brand colors above).
- **Never call these functions from client components.** All exports are server-side only.
- **Never skip `wrap: true`** on PDF content pages with variable-length AI text — without it, long sections clip instead of flowing to the next page.
- **Never mix raw `TextRun` directly in a DOCX section `children` array.** Only `Paragraph | Table` are valid section children; `TextRun` must always be nested inside a `Paragraph`.
- **Never use `Packer.toBuffer()` result as a `Buffer` without coercing it.** In some `docx` versions `toBuffer()` resolves to `Uint8Array`; always wrap with `Buffer.from(buffer)` when the declared return type is `Buffer`.
