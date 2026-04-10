/**
 * GET /api/auth/callback
 *
 * Supabase PKCE (Proof Key for Code Exchange) OAuth callback handler.
 * Supabase redirects here after the user completes email magic-link or OAuth
 * sign-in. This route exchanges the one-time `code` query param for a full
 * Supabase session cookie, then redirects the browser to the intended page.
 *
 * Auth: NOT required — this IS the auth step. The route is publicly reachable
 *       so that unauthenticated browsers can complete the sign-in handshake.
 *
 * Query params:
 *   - code  (string)  — one-time PKCE authorization code from Supabase
 *   - next  (string, optional) — path to redirect to after success;
 *           defaults to ROUTES.DASHBOARD
 *
 * Success:  302 redirect to `${origin}${next}`
 * Failure:  302 redirect to login page with ?error=auth_callback_failed
 *           (covers missing code AND Supabase exchange errors)
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ROUTES } from '@/lib/constants'

/**
 * What it does:
 * Forces the Next.js route to be dynamic, preventing static optimization or caching.
 *
 * Why it is used:
 * This is crucial for authentication callback routes that need to process one-time authorization codes and set session cookies. By forcing dynamic rendering, the route ensures that the `GET` request always runs on the server, can access request-specific URL parameters, and can modify the response headers (e.g., to set HTTP-only cookies).
 *
 * Important implementation details:
 * Set to the string literal 'force-dynamic'. This opts the route segment into dynamic rendering at request time, which is necessary for server-side authentication flows involving stateful operations like cookie management.
 */
export const dynamic = 'force-dynamic'

/**
 * Exchanges a Supabase PKCE authorization code for a session cookie.
 *
 * @param request - Incoming GET request with `code` (and optional `next`) query params
 * @returns Redirect to dashboard (or `next`) on success, redirect to login on failure
 */
/**
 * What it does:
 * Handles the Supabase PKCE (Proof Key for Code Exchange) authorization code callback. It receives a one-time authorization code from Supabase, exchanges it for a user session, sets the authentication cookie, and then redirects the user to the intended destination within the application.
 *
 * Why it is used:
 * This is the designated endpoint in the application's authentication flow where Supabase redirects the user after a successful login (e.g., via email magic link, OAuth provider, or password reset confirmation). Its primary purpose is to complete the server-side part of the authentication by converting the temporary authorization code into a persistent user session, making the user officially logged in.
 *
 * Important implementation details:
 * 1.  **Code and Next Path Extraction**: It extracts the `code` query parameter, which is the authorization code provided by Supabase. It also extracts an optional `next` query parameter, allowing for post-login deep linking. If `next` is not provided, it defaults to `ROUTES.DASHBOARD`.
 * 2.  **Server-Side Supabase Client**: It uses `createClient()` from `@/lib/supabase/server` to instantiate a Supabase client. This client is specifically configured for server-side operations, enabling it to securely exchange codes and set `HttpOnly` session cookies in the response.
 * 3.  **Session Exchange**: Calls `supabase.auth.exchangeCodeForSession(code)` to validate the code. This method handles the cryptographic exchange and, upon success, automatically sets the Supabase authentication cookie on the `NextResponse` before the redirect.
 * 4.  **Redirect Logic**: On successful session exchange, the user is redirected to the `origin` combined with the `next` path. If the `code` is missing or the session exchange fails (e.g., invalid code, network error), the user is redirected to the login page (`ROUTES.LOGIN`) with an `error=auth_callback_failed` query parameter for debugging or user feedback.
 * 5.  **Dynamic Rendering**: This route explicitly uses `export const dynamic = 'force-dynamic'` to ensure it's always executed dynamically on the server. This is critical for handling unique authorization codes for each request and for correctly setting cookies.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  // One-time code provided by Supabase in the redirect URL
  const code = searchParams.get('code')
  // Allow callers to specify where to land after sign-in (e.g. a deep link)
  const next = searchParams.get('next') ?? ROUTES.DASHBOARD

  if (code) {
    const supabase = createClient()
    // Exchange the PKCE code for a session; this sets the auth cookie on the response
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Missing code OR exchange error → send user back to login with an error hint
  return NextResponse.redirect(`${origin}${ROUTES.LOGIN}?error=auth_callback_failed`)
}
