/**
 * Next.js Edge Middleware — authentication gating and session refresh.
 *
 * Runs before every request that is not a static asset (see `config.matcher` below).
 * Responsibilities:
 * 1. Refresh the Supabase auth session token if it is near expiry (handled transparently
 *    by `@supabase/ssr` when the cookies are wired through the middleware response).
 * 2. Redirect unauthenticated users away from protected routes to `/login`.
 * 3. Redirect already-authenticated users away from `/login` to `/dashboard`.
 *
 * Protected routes are all app routes under `(app)/`. Public routes (`(public)/` and
 * `/api/`) do NOT need auth and are intentionally absent from `isProtectedRoute`.
 *
 * Note: The Supabase client is created inline here (not via `lib/supabase/server.ts`)
 * because middleware runs in the Edge runtime and needs direct access to both the
 * incoming `request.cookies` and the outgoing `response.cookies` for token refresh.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Start with a pass-through response; may be replaced during cookie mutations below
  let response = NextResponse.next({ request: { headers: request.headers } })

  // Inline Supabase client wired to both request and response cookies so that
  // token refresh writes are propagated back to the browser on every request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          // Must mutate both request and response to keep the session in sync
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

  // Validate the session — this also triggers a token refresh if needed
  const { data: { user } } = await supabase.auth.getUser()

  // Routes that require authentication (all professor-facing app routes)
  // Public routes (/portfolio/*, /shared/*, /speaker/*, /api/*) are intentionally excluded
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/preview') ||
    request.nextUrl.pathname.startsWith('/history') ||
    request.nextUrl.pathname.startsWith('/analytics') ||
    request.nextUrl.pathname.startsWith('/roster') ||
    request.nextUrl.pathname.startsWith('/reports') ||
    request.nextUrl.pathname.startsWith('/compare') ||
    request.nextUrl.pathname.startsWith('/semesters') ||
    request.nextUrl.pathname.startsWith('/account')

  // Unauthenticated user hitting a protected route → send to login
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated user hitting the login page → send to dashboard
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  // Run on all routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
