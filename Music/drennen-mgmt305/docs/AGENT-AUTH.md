# AGENT-AUTH.md — Agent 05: Authentication
# Wave 2 agent. Fires after Wave 1 (scaffold, types, supabase setup, design system) is merged.

---

## MANDATORY PRE-READ

Before writing a single line of code:
1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md (especially GOTCHA-001 and GOTCHA-002)
4. SCHEMA.md
5. ENV.md
6. TYPES.md

---

## YOUR JOB

Build the complete authentication layer. You own these files and ONLY these files:

```
lib/supabase/client.ts
lib/supabase/server.ts
middleware.ts
app/(auth)/login/page.tsx
components/AuthForm.tsx
app/api/auth/callback/route.ts
```

---

## FILE 1: lib/supabase/client.ts

Browser-side Supabase client. Used in Client Components only.

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## FILE 2: lib/supabase/server.ts

Server-side Supabase client. Used in Server Components, API routes, and middleware. Reads cookies for session state.

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}

// Admin client — bypasses RLS for server-side inserts
// Only import this in lib/db/ functions, never in components or pages
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() { return undefined },
        set() {},
        remove() {},
      },
    }
  )
}
```

---

## FILE 3: middleware.ts

Protects all (app) routes. Redirects unauthenticated users to /login. Refreshes Supabase session on every request.

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/preview') ||
    request.nextUrl.pathname.startsWith('/history')

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## FILE 4: app/(auth)/login/page.tsx

Login page. Renders the AuthForm component. No business logic here.

- Title: "Drennen MGMT 305"
- Subtitle: "Guest Speaker Question Generator"
- Show Google OAuth button (primary, orange)
- Show divider "or"
- Show email/password form
- No sign-up link (accounts are admin-created — see DECISIONS.md DEC-006)
- On error, show a clean error message below the form

---

## FILE 5: components/AuthForm.tsx

`"use client"` — this component handles form state.

Handles two flows:
1. **Google OAuth:** calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/api/auth/callback' } })`
2. **Email/password:** calls `supabase.auth.signInWithPassword({ email, password })`

On success: router.push('/dashboard')
On error: display the error message from Supabase

Use the brand orange (#f36f21) for the primary Google button.
Use a clean secondary style for the email/password submit button.

---

## FILE 6: app/api/auth/callback/route.ts

Standard Supabase OAuth callback handler. Exchanges code for session.

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

---

## LOGOUT

Logout is handled in the NavHeader component (owned by Agent 11). You do not need to build it. It calls `supabase.auth.signOut()` and redirects to /login.

---

## COMPLETION CHECKLIST

- [ ] `lib/supabase/client.ts` — browser client exports `createClient`
- [ ] `lib/supabase/server.ts` — server client exports `createClient` and `createAdminClient`
- [ ] `middleware.ts` — protects dashboard/preview/history, redirects on auth state
- [ ] `app/(auth)/login/page.tsx` — renders AuthForm
- [ ] `components/AuthForm.tsx` — handles Google + email/password flows
- [ ] `app/api/auth/callback/route.ts` — exchanges OAuth code for session
- [ ] `npx tsc --noEmit` passes with zero errors
