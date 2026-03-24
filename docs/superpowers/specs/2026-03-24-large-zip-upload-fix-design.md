# Design: Large ZIP Upload Fix

**Date:** 2026-03-24
**Status:** Approved

## Problem

When a professor uploads a ZIP containing 27+ student submissions where some `.docx` files are unusually large (due to embedded images, revision history, or formatting bloat), the upload either silently fails or hangs indefinitely, leaving the UI stuck in the ProcessingView with no feedback.

### Root causes

1. **Request body size limit** — Vercel enforces a request body size limit for serverless functions. Large ZIPs can exceed this, causing the server to reject the request before the handler runs and return a non-JSON error response. Note: this limit is Vercel-platform-enforced, not a Next.js config option. The correct fix is via `vercel.json` memory/duration config or, if the limit cannot be raised, via an alternative upload path (Vercel Blob). This needs to be validated locally vs. deployed.
2. **Non-JSON error response causes unintelligible UI state** — when `res.json()` throws (because the server returned a 413 HTML page instead of JSON), the `catch` block calls `setError` with a raw JS parse error ("Unexpected token '<'") rather than a human-readable message. The error does surface through `ProcessingView`'s existing `onExited` animation path, but the message is useless.
3. **Sequential file parsing is slow** — `builder.ts` parses PDFs and DOCXs one at a time in a `for` loop. For 27+ files this is unnecessarily slow. However, running all 27 concurrently with `Promise.all` risks significant heap pressure when some `.docx` files are 10–30 MB (mammoth decompresses each entirely in memory). A chunk-based approach avoids this.

## Constraints

- All files must be processed — no skipping based on file size.
- Speed must stay the same or improve.
- No new dependencies.

## Solution: 3 targeted changes

### Change 1 — Address request body size limit (`vercel.json`)

**Investigation required first:** Reproduce the blank-UI failure locally with `next dev` using the same large ZIP. If it fails locally, the limit is Next.js/Node.js enforced (unlikely for App Router Route Handlers — there is no built-in limit in `next dev`). If it only fails on Vercel, it is a Vercel platform limit.

**If the issue is Vercel-only:**
Vercel enforces a **4.5 MB request body limit for serverless functions on all plans** (Hobby, Pro, and Enterprise). No `vercel.json` config option raises this. The only fix is to bypass the function body entirely:

Use **Vercel Blob** — upload the ZIP directly from the client to Vercel Blob Storage, then pass the resulting blob URL to the Route Handler. The handler downloads the file server-side (no body size constraint applies). This is the most robust fix but requires additional implementation work beyond the three changes below.

**Immediate mitigation regardless of environment:**
The `vercel.json` already has `maxDuration: 60` for the route. No change needed there.

For local `next dev`, no body size limit applies to App Router Route Handlers — if failures only occur in production, this confirms the Vercel platform as the enforcer.

### Change 2 — Fix unintelligible error message (`app/(app)/dashboard/page.tsx`)

The existing error handling correctly flows through `ProcessingView`'s `onExited` animation. **Do not add a `finally` block** — that would bypass the 300ms fade-out animation and unmount `ProcessingView` before it can animate.

The only fix needed is a guard around `res.json()` so a non-JSON response (413 HTML, empty body) produces a readable message:

```ts
let data: Record<string, unknown>
try {
  data = await res.json()
} catch {
  setError('Upload failed — the file may be too large or the server timed out.')
  return
}
```

This replaces the current bare `await res.json()` call on line 34.

### Change 3 — Chunked parallel file parsing (`lib/parse/builder.ts`)

Replace the sequential `for` loop with a chunk-based parallel approach. Process files in batches of 5 concurrently. This is meaningfully faster than sequential for 27+ files, while avoiding the memory pressure of launching all 27 mammoth/pdf-parse instances at once:

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

Use this in `buildSubmissionsText` with `chunkSize = 5`. Note: `extractZip` already loads all file buffers into memory before parsing begins, so the memory benefit here is specifically in the parse phase (mammoth/pdf-parse CPU and GC pressure), not total buffer footprint.

Concrete call site:

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

## Files changed

| File | Change |
|------|--------|
| `vercel.json` | Potentially: add Blob upload path if Vercel plan limits apply (needs investigation first) |
| `app/(app)/dashboard/page.tsx` | Guard `res.json()` with try/catch for human-readable error on non-JSON response |
| `lib/parse/builder.ts` | Replace sequential `for` loop with chunk-based `Promise.all` (chunkSize = 5) |

## What is not changing

- No new dependencies.
- Server parse pipeline (`unzip.ts`, `pdf.ts`, `docx.ts`) unchanged.
- No skipping or filtering of files by size.
- AI call, Supabase session storage, and export pipeline unchanged.
- `ProcessingView` animation/teardown logic unchanged.

## Open question before implementation

Run the failing ZIP through `next dev` locally. If it also fails locally, the root cause is NOT the Vercel body limit — it is likely a memory/OOM crash or a timeout during parsing large DOCX files. In that case Change 3 (parallel chunked parsing) may be the primary fix, with Change 2 (error message guard) ensuring the professor sees a real error if it does fail.
