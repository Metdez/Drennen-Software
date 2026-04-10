# lib/supabase/ — Client and Storage Helpers

This directory holds all Supabase access modes and temp-storage utilities used by the app.

## Files

| File | Client type | Auth | Used by |
|------|------------|------|---------|
| `client.ts` | Browser (`createBrowserClient`) | Anon key + cookie session | React Client Components, browser auth |
| `server.ts` | Server (`createServerClient`) | Anon key + cookie (RLS) **or** service role | All API routes, Server Components |
| `storage.ts` | Browser (uses `client.ts`) | Anon key + user cookie | Dashboard upload form before hitting `/api/process` |
| `storage.server.ts` | Server admin (uses `createAdminClient`) | Service role | `app/api/process/route.ts` — download + delete temp ZIPs |

---

## When to use `createClient()` vs `createAdminClient()`

### `createClient()` — cookie-based, RLS enforced
- **Use for:** all standard user-scoped reads and writes in API route handlers, Server Components, and Server Actions.
- **How it works:** reads the user's session from the Next.js cookie store; Supabase RLS policies run automatically, so queries only return rows the authenticated user owns.
- **Import from:** `@/lib/supabase/server`

### `createAdminClient()` — service role, bypasses RLS entirely
- **Use for:**
  - Storage operations in routes where the user's session cookie is not available (e.g. `storage.server.ts`)
  - Background / fire-and-forget AI jobs that fan out across multiple users (class insights, student profiles)
  - Webhook handlers (Stripe) that update rows not owned by any single request user
- **NEVER use for:** regular user-scoped reads. Bypassing RLS can expose other users' data.
- **Import from:** `@/lib/supabase/server`

---

## Browser client vs server client

| | `client.ts` | `server.ts` |
|---|---|---|
| Runtime | Browser only | Node.js / Edge (server) |
| Where to import | `'use client'` components | API routes, Server Components, middleware |
| Auth mechanism | Reads/writes session cookie automatically via `@supabase/ssr` | Reads/writes via Next.js `cookies()` so the token is always fresh |
| Token refresh | Handled by `createBrowserClient` | Handled by `createServerClient` — sets/removes cookies as needed |

---

## Temp-uploads storage flow

```
Browser (upload form)
  └── uploadTempZip()     [storage.ts]
        └── stores at "temp-uploads/{userId}/{timestamp}-{filename}"
              └── returns storagePath → passed to POST /api/process

Server (POST /api/process)
  ├── downloadTempZip(storagePath)  [storage.server.ts]
  │     └── admin client downloads bytes → Buffer for ZIP parsing
  └── deleteTempZip(storagePath)    [storage.server.ts]
        └── admin client removes file regardless of success/failure
```

- The `temp-uploads` bucket is ephemeral — files are never kept after processing.
- `deleteTempZip` swallows errors intentionally: a leaked temp file is not fatal.
- The admin client is required for server-side storage because the route handler runs outside the user's cookie context after the multipart form is parsed.
