/**
 * Browser-side Supabase client factory.
 *
 * Use `createClient()` from this module inside React Client Components and browser-only
 * utilities. It uses the anon key and relies on the user's session cookie for auth,
 * so RLS policies are fully enforced.
 *
 * For server-side access (Server Components, Route Handlers, middleware) use
 * `lib/supabase/server.ts` instead — it properly threads the cookie store through
 * Next.js request/response so the session is correctly read and refreshed.
 */
import { createBrowserClient } from '@supabase/ssr'

/**
 * Returns a Supabase client suitable for use in the browser.
 *
 * The `@supabase/ssr` `createBrowserClient` automatically handles token refresh
 * and persists the session in cookies so server components can read it on the next request.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
