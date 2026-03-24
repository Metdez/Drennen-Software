# Large ZIP Upload Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix silent failures and hangs when professors upload large ZIPs containing 27+ student submissions, and speed up file parsing.

**Architecture:** Two surgical file edits: (1) guard `res.json()` in the dashboard so bad server responses produce readable error messages, (2) replace the sequential file parse loop in `builder.ts` with chunk-based parallelism (5 at a time). A separate diagnostic task confirms whether Vercel's 4.5 MB body limit is also a factor.

**Tech Stack:** Next.js 14 App Router, TypeScript. No new dependencies. Validation via `npm run type-check` and `npm run lint` (no test runner in this project).

---

## File Map

| File | What changes |
|------|-------------|
| `app/(app)/dashboard/page.tsx` | Wrap `res.json()` in try/catch so non-JSON responses (413, empty body) produce a human-readable error instead of a raw JS parse error |
| `lib/parse/builder.ts` | Add `processInChunks` helper; replace sequential `for` loop with chunked `Promise.all` (chunkSize = 5) |

`vercel.json`, `lib/parse/unzip.ts`, `lib/parse/pdf.ts`, `lib/parse/docx.ts`, `lib/ai/`, and all export/DB code are **not touched**.

---

## Task 1: Diagnose — does the failure happen locally?

This task determines whether the Vercel 4.5 MB request body limit is a contributing factor. It requires no code changes.

**Files:** none

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Sign in at `http://localhost:3000`. Navigate to the Dashboard.

- [ ] **Step 2: Upload the same large ZIP that fails in production**

Use the exact ZIP that causes the blank-UI issue on Vercel. Click "Generate Question Sheet" and observe the result.

- [ ] **Step 3: Record the outcome**

Two possible results:

**A — It also fails locally (blank UI or error):**
The issue is NOT the Vercel body limit. Root cause is memory pressure or a timeout during parsing of large `.docx` files. Task 2 (error message fix) and Task 3 (chunked parsing) are the primary fixes. No Vercel Blob work needed.

**B — It works locally but fails on Vercel:**
The Vercel 4.5 MB body limit is the root cause. Tasks 2 and 3 will still improve reliability and speed, but the Vercel body limit will remain a hard ceiling. Larger ZIPs will need Vercel Blob Storage — a separate implementation effort outside this plan. Document the finding in a comment on this task.

---

## Task 2: Fix unintelligible error on upload failure

When the server returns a non-JSON response (e.g. a 413 HTML page or an empty body), `res.json()` currently throws a raw JS parse error like `"Unexpected token '<'"`. This gets set as the error message, which is meaningless to a professor. This task fixes that.

**Context on the error flow** — read this before editing:
`ProcessingView` (`components/ProcessingView.tsx`) watches the `error` prop. When `error` becomes non-null it cancels the fake-progress timers, starts a 300ms fade-out, then calls `onExited`. `onExited` (in `dashboard/page.tsx`) calls `setIsLoading(false)` and resets state. **Do not add a `finally` block** — it would clear `isLoading` immediately, unmounting `ProcessingView` before the fade-out runs.

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Read the current `handleGenerate` function**

Open `app/(app)/dashboard/page.tsx`. Find `handleGenerate` (starts at line 20). Locate the bare `await res.json()` call at line 34. Understand that it is inside the outer `try/catch` (lines 28–48) — any throw from it currently lands in the `catch` at line 45, which sets `err.message` as the error.

- [ ] **Step 2: Replace the bare `res.json()` call with a guarded version**

Replace this (line 34):
```ts
const data = await res.json()
```

With this:
```ts
let data: Record<string, unknown>
try {
  data = await res.json()
} catch {
  setError('Upload failed — the file may be too large or the server timed out.')
  return
}
```

The `return` exits `handleGenerate` with `isLoading` still `true` and `error` set — `ProcessingView` picks up the non-null `error`, fades out, calls `onExited`, which resets both. The animation path is preserved.

- [ ] **Step 3: Update the downstream references to `data`**

After this change, `data` is typed as `Record<string, unknown>`. The lines that follow use `data.error`, `data.sessionId`, and `data.output`. TypeScript will require casts or narrowing. Update lines 36–44:

```ts
if (!res.ok) {
  setError((data.error as string) || 'Failed to process files')
  return
}

sessionStorage.setItem(`session_${data.sessionId}`, data.output as string)
pendingSessionIdRef.current = data.sessionId as string
setDone(true)
```

- [ ] **Step 4: Type-check**

```bash
npm run type-check
```

Expected: no errors. If TypeScript complains about `data` being used before assignment (it can't since the inner try/catch either assigns or returns), add a non-null assertion or initialize: `let data: Record<string, unknown> = {}`.

- [ ] **Step 5: Lint**

```bash
npm run lint
```

Expected: no new warnings.

- [ ] **Step 6: Verify manually**

Start `npm run dev`. Try submitting the form with no file selected (button should be disabled — confirms the form still works). Then verify with a normal small ZIP that the happy path still routes to `/preview`.

- [ ] **Step 7: Commit**

```bash
git add app/(app)/dashboard/page.tsx
git commit -m "fix: show readable error when server returns non-JSON response on upload"
```

---

## Task 3: Chunked parallel file parsing

`buildSubmissionsText` in `lib/parse/builder.ts` currently parses every file sequentially in a `for` loop. For 27 files this means each PDF/DOCX waits for the previous one to finish. This task replaces that with concurrent batches of 5, meaningfully reducing total parse time.

**Memory note:** `extractZip` (called before this function) already loads all file buffers into memory before parsing begins — so peak buffer memory is unchanged. The benefit here is CPU/GC throughput: mammoth and pdf-parse work in parallel instead of blocking each other.

**Files:**
- Modify: `lib/parse/builder.ts`

- [ ] **Step 1: Read the current `buildSubmissionsText` function**

Open `lib/parse/builder.ts`. The sequential loop is at lines 32–47. Also note the `ParsedSubmission` interface (lines 5–9) and the `ZipEntry` type imported from `./unzip` — you'll need both for type annotations.

- [ ] **Step 2: Add the `processInChunks` helper above `buildSubmissionsText`**

Insert this function between `extractStudentName` and `buildSubmissionsText`:

```ts
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
```

- [ ] **Step 3: Replace the sequential `for` loop with `processInChunks`**

Delete lines 30–48 (from `const submissions: ParsedSubmission[] = []` through the closing `}` of the for loop, inclusive) and replace with:

```ts
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
```

- [ ] **Step 4: Export `ZipEntry` from `unzip.ts` and import it in `builder.ts`**

`ZipEntry` is currently an internal (non-exported) interface in `lib/parse/unzip.ts`. The `processInChunks` call site needs it in scope in `builder.ts`.

In `lib/parse/unzip.ts`, add `export` to the interface declaration:

```ts
// change:
interface ZipEntry {
// to:
export interface ZipEntry {
```

Then in `lib/parse/builder.ts` line 1, add `ZipEntry` to the existing import:

```ts
// change:
import { extractZip } from './unzip'
// to:
import { extractZip, ZipEntry } from './unzip'
```

- [ ] **Step 5: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 6: Lint**

```bash
npm run lint
```

Expected: no new warnings.

- [ ] **Step 7: Manual smoke test**

Start `npm run dev`. Upload a ZIP with several student files. Confirm the result routes to `/preview` with all students' questions present. Check the server console for any errors or warnings.

- [ ] **Step 8: Commit**

```bash
git add lib/parse/unzip.ts lib/parse/builder.ts
git commit -m "perf: parse student files in parallel chunks (5 at a time) instead of sequentially"
```

---

## Task 4 (conditional): Document Vercel body limit finding

Only do this task if Task 1 revealed that the failure is **Vercel-only** (works locally, fails in production).

**Files:** none (just a note for the team)

- [ ] **Step 1: Add a comment to `vercel.json`**

Open `vercel.json`. Add a comment block (JSON doesn't support comments, so add it as a note in the README or in a `_notes` key — or simply file a follow-up issue). The key fact to record:

> Vercel enforces a 4.5 MB request body limit for serverless functions on all plans. No `vercel.json` config can raise this. If the class ZIP regularly exceeds 4.5 MB, the fix is to use Vercel Blob Storage: upload the ZIP from the client directly to Blob, then pass the blob URL to `/api/process`. The handler downloads the file server-side, bypassing the body limit entirely.

- [ ] **Step 2: Commit the note**

```bash
git add <whatever file you put the note in>
git commit -m "docs: note Vercel 4.5MB body limit and Blob Storage fix path"
```
