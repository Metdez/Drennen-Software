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

*No errors logged yet. This file grows as the project is built.*

*When the first error is found and fixed during Wave 1, Wave 2, Wave 3, or Integration, add it here immediately. The next agent that runs will read it and route around it.*

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
