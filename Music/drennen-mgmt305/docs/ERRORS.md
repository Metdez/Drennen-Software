# ERRORS.md — Self-Annealing Error Log
# Every mistake that has been made and fixed is recorded here.
# Agents read this file BEFORE writing any code.
# If a prevention rule exists for the thing you're about to do — stop and do it differently.
# When you fix a new error, add it here in the format below.

---

## HOW TO ADD AN ERROR

Copy this template and fill it in:

```
## ERR-[XXX]
**Symptom:** What went wrong / what error message appeared
**Root cause:** Why it happened
**Fix applied:** Exactly what was changed to fix it
**Files affected:** Which files were involved
**Prevention rule:** The rule an agent must follow to never make this mistake again
```

---

## CURRENT ERROR LOG

## ERR-001
**Symptom:** `DownloadButtons.tsx` calls `GET /api/sessions/${sessionId}/download?format=pdf|docx` but the route did not exist, resulting in a 404 when the user clicks "Download PDF" or "Download Word Doc".
**Root cause:** Agent 10 (API Routes) built the data routes (`/api/process`, `/api/sessions`, `/api/sessions/[id]`) but did not create the download route. Agent 11 (Main UI) built `DownloadButtons.tsx` expecting the route to exist. Neither agent's scope explicitly covered this gap.
**Fix applied:** Created `app/api/sessions/[id]/download/route.ts` during Integration. The route verifies auth, fetches the session, checks ownership, validates the `format` query param (`pdf` or `docx`), calls `generatePDF` or `generateDocx`, and returns the buffer with correct `Content-Type` and `Content-Disposition` headers.
**Files affected:** `app/api/sessions/[id]/download/route.ts` (created)
**Prevention rule:** Any time a UI component calls a route, verify the route file exists before marking the UI component as complete. Cross-reference `DownloadButtons.tsx` fetch calls against `app/api/` file tree.

---

## ERR-002
**Symptom:** `next build` fails with `Error: Configuring Next.js via 'next.config.ts' is not supported.`
**Root cause:** Next.js 14.2.x does not support TypeScript config files (`next.config.ts`). Agent 01 (Scaffold) created the config as `.ts` but the installed Next.js version only accepts `.js` or `.mjs`.
**Fix applied:** Replaced `next.config.ts` with `next.config.mjs` using ESM syntax. Also added `unzipper` to `serverComponentsExternalPackages` to avoid webpack bundling its optional `@aws-sdk/client-s3` dependency.
**Files affected:** `next.config.ts` (deleted), `next.config.mjs` (created)
**Prevention rule:** For Next.js 14.2.x, always use `next.config.mjs` (ESM) or `next.config.js` (CJS). Do not use `.ts` extension. Check the installed Next.js version before choosing config format.

---

## ERR-003
**Symptom:** `next build` fails with `Module not found: Can't resolve '@aws-sdk/client-s3'` traced from `unzipper`.
**Root cause:** `unzipper` has an optional dependency on `@aws-sdk/client-s3` for S3 streaming. Webpack tries to bundle it even though it's never used by our code.
**Fix applied:** Added `'unzipper'` to `experimental.serverComponentsExternalPackages` in `next.config.mjs` so webpack skips bundling it and uses Node.js `require` at runtime instead.
**Files affected:** `next.config.mjs`
**Prevention rule:** When a server-side package has optional native or cloud SDK dependencies, add it to `serverComponentsExternalPackages` in the Next.js config.

---

## ERR-004
**Symptom:** `next build` type check fails: `Type error: Argument of type 'Buffer<ArrayBufferLike>' is not assignable to parameter of type 'BodyInit | null | undefined'` in the download route.
**Root cause:** The Web `Response` constructor does not accept Node.js `Buffer` directly. It requires `Uint8Array`, `Blob`, `ReadableStream`, or `string`.
**Fix applied:** Wrapped `buffer` with `new Uint8Array(buffer)` before passing to `new Response(...)` in the download route.
**Files affected:** `app/api/sessions/[id]/download/route.ts`
**Prevention rule:** When returning a Node.js `Buffer` from an API route via `new Response(buffer, ...)`, always convert with `new Uint8Array(buffer)` first.

---

## ERR-005
**Symptom:** `next build` fails with `The OPENAI_API_KEY environment variable is missing or empty` during page data collection.
**Root cause:** `lib/ai/client.ts` instantiated the OpenAI client at module top-level. During `next build`, the module is loaded to collect page data, but env vars aren't available at build time (no `.env.local` in CI). The OpenAI SDK throws immediately if `apiKey` is undefined.
**Fix applied:** Changed from top-level instantiation to lazy initialization via a `getClient()` function that creates the client on first call.
**Files affected:** `lib/ai/client.ts`
**Prevention rule:** Never instantiate SDK clients at module top-level if they require env vars. Use lazy initialization (create on first call) so the module can be imported at build time without crashing.

---

## ERR-006
**Symptom:** `next build` fails during static generation with `@supabase/ssr: Your project's URL and API key are required to create a Supabase client!` on `/dashboard`, `/preview`, `/history`, and API routes.
**Root cause:** Next.js tries to statically prerender pages and API routes at build time. Pages and layouts that use the Supabase server client (which calls `cookies()`) crash because (a) env vars are absent at build time and (b) `cookies()` requires a request context.
**Fix applied:** Added `export const dynamic = 'force-dynamic'` to all pages and API routes that use auth/cookies: `app/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/history/page.tsx`, all `app/api/` route files.
**Files affected:** `app/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/history/page.tsx`, `app/api/process/route.ts`, `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/sessions/[id]/download/route.ts`, `app/api/auth/callback/route.ts`
**Prevention rule:** Any page or API route that calls `cookies()`, `createClient()` from `@/lib/supabase/server`, or `getCurrentUser()` must export `const dynamic = 'force-dynamic'`. This prevents Next.js from attempting static prerendering.

---

## KNOWN GOTCHAS (pre-logged before any agent runs)

These are not errors that have occurred — they are known traps from experience with this exact stack. Treat them as prevention rules from day one.

---

## GOTCHA-001: Supabase client in Server Components

**Symptom:** `Error: cookies() was called outside a request scope` or `createClient is not a function`

**Cause:** Used `createClient` from `@supabase/supabase-js` directly in a Server Component or API route instead of the SSR-aware helper.

**Prevention rule:** In ANY file inside `app/` (pages, layouts, API routes), always import Supabase from `@/lib/supabase/server`. Only import from `@/lib/supabase/client` inside files with `"use client"` at the top.

```ts
// WRONG — in a Server Component or API route
import { createClient } from '@supabase/supabase-js'

// RIGHT — in a Server Component or API route
import { createClient } from '@/lib/supabase/server'

// RIGHT — in a Client Component (has "use client" at top)
import { createClient } from '@/lib/supabase/client'
```

---

## GOTCHA-002: Middleware not running on API routes

**Symptom:** API routes return data even when user is not logged in.

**Cause:** Supabase middleware must refresh the session on every request, but if the matcher excludes API routes, the session is stale.

**Prevention rule:** The middleware matcher in `middleware.ts` must include API routes. Use this exact matcher:

```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## GOTCHA-003: Next.js App Router and FormData in API routes

**Symptom:** `req.body` is undefined in an App Router API route receiving FormData.

**Cause:** App Router API routes do not use `req.body`. FormData is accessed via `request.formData()`.

**Prevention rule:** In App Router API routes, always use:

```ts
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const speakerName = formData.get('speakerName') as string
}
```

---

## GOTCHA-004: pdf-parse requires Buffer not File

**Symptom:** `TypeError: argument must be a Buffer` when parsing PDFs.

**Cause:** Files from FormData are `File` objects (Web API). `pdf-parse` requires a Node.js `Buffer`.

**Prevention rule:** Always convert `File` to `Buffer` before passing to `pdf-parse` or `unzipper`:

```ts
const file = formData.get('file') as File
const arrayBuffer = await file.arrayBuffer()
const buffer = Buffer.from(arrayBuffer)
```

---

## GOTCHA-005: @react-pdf/renderer must run server-side only

**Symptom:** Build error or runtime crash when PDF renderer is imported in a Client Component.

**Cause:** `@react-pdf/renderer` uses Node.js APIs not available in the browser.

**Prevention rule:** Only import `lib/export/pdf.ts` from API routes or Server Components. Never import it in a `"use client"` file. The download trigger in `DownloadButtons.tsx` calls the API route — it does not import the PDF library directly.

---

## GOTCHA-006: Supabase RLS blocks service role on wrong client

**Symptom:** Inserts fail silently or return RLS violation errors even with the service role key.

**Cause:** Using the anon client (which respects RLS) instead of the service role client for server-side inserts.

**Prevention rule:** The server Supabase client in `lib/supabase/server.ts` must use the service role key for admin operations (like inserting sessions server-side). The anon key is for browser-side operations only.

---

## GOTCHA-007: unzipper async iteration pattern

**Symptom:** ZIP extraction returns empty array or hangs.

**Cause:** `unzipper` uses streams. Forgetting to await the stream properly results in empty output.

**Prevention rule:** Use this exact pattern for ZIP extraction:

```ts
import unzipper from 'unzipper'

const directory = await unzipper.Open.buffer(zipBuffer)
const files = directory.files.filter(f => !f.path.startsWith('__MACOSX'))
```

Filter `__MACOSX` — Canvas ZIPs always include these junk files from Mac uploads.

---

## GOTCHA-008: Environment variables undefined at build time

**Symptom:** `process.env.XAI_API_KEY` is `undefined` even though it's in `.env.local`.

**Cause:** Server-only env vars (no `NEXT_PUBLIC_` prefix) are not available on the client side. If a client component tries to access them, they'll be undefined.

**Prevention rule:** Never access `XAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or any non-`NEXT_PUBLIC_` var in client components. See ENV.md for the complete scope table.
