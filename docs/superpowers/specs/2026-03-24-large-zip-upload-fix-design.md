# Design: Large ZIP Upload Fix

**Date:** 2026-03-24
**Status:** Approved

## Problem

When a professor uploads a ZIP containing 27+ student submissions where some `.docx` files are unusually large (due to embedded images, revision history, or formatting bloat), the upload silently fails and the UI goes blank. The Generate button appears to do nothing.

### Root causes

1. **Next.js 4 MB request body limit** — large ZIPs exceed this and the server rejects the request before the handler runs, returning a non-JSON error response.
2. **Blank UI bug** — when `res.json()` throws (because the server returned a non-JSON 413 or empty response), the outer `catch` sets `error` state but `isLoading` remains `true`, so `ProcessingView` stays visible and hides the error message.
3. **Sequential file parsing** — `builder.ts` parses PDFs and DOCXs one at a time in a `for` loop, making 27-file batches slower than necessary.

## Constraints

- All files must be processed — no skipping based on file size.
- Speed must stay the same or improve.
- No new dependencies or infrastructure.

## Solution: 3 targeted changes

### Change 1 — Raise body size limit (`next.config.mjs`)

Add a `serverActions.bodySizeLimit` and an API body size override to cover the `/api/process` route. Set to `50mb` — enough for any realistic class ZIP.

In Next.js 14 App Router, the request body size for Route Handlers is controlled via `next.config.mjs`:

```js
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'unzipper'],
    serverActions: { bodySizeLimit: '50mb' },
  },
}
```

Also add `export const maxDuration = 60` to the route file to ensure the function doesn't time out on large batches.

### Change 2 — Fix blank UI on upload failure (`app/(app)/dashboard/page.tsx`)

The `handleGenerate` function must call `setIsLoading(false)` when an error occurs, so the form becomes visible and the error message can be displayed. Use a `finally` block to guarantee `isLoading` is always cleared:

```ts
try {
  // ... fetch and handle response
} catch (err) {
  setError(message)
} finally {
  // Only clear loading if we're not navigating away on success
  if (!pendingSessionIdRef.current) setIsLoading(false)
}
```

Also guard `res.json()` so a non-JSON response (e.g. a 413 HTML page) produces a readable error rather than an unhandled throw.

### Change 3 — Parallel file parsing (`lib/parse/builder.ts`)

Replace the sequential `for` loop with `Promise.all` so all 27+ files are parsed concurrently. This directly improves throughput since PDF and DOCX parsing are I/O-bound operations:

```ts
const results = await Promise.all(
  entries.map(async (entry) => {
    const text = entry.extension === 'pdf'
      ? await parsePdf(entry.buffer)
      : await parseDocx(entry.buffer)
    if (!text.trim()) return null
    return {
      studentName: extractStudentName(entry.filename),
      filename: entry.filename,
      text: text.trim(),
    }
  })
)
const submissions = results.filter((s): s is ParsedSubmission => s !== null)
```

## Files changed

| File | Change |
|------|--------|
| `next.config.mjs` | Add `bodySizeLimit: '50mb'` under `experimental.serverActions` |
| `app/api/process/route.ts` | Add `export const maxDuration = 60` |
| `app/(app)/dashboard/page.tsx` | Fix `isLoading` not clearing on error; guard `res.json()` |
| `lib/parse/builder.ts` | Replace sequential `for` loop with `Promise.all` |

## What is not changing

- No new dependencies.
- Server parse pipeline (`unzip.ts`, `pdf.ts`, `docx.ts`) unchanged.
- No skipping or filtering of files by size.
- AI call, Supabase session storage, and export pipeline unchanged.
