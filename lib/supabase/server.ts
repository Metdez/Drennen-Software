/**
 * Server-side Supabase client factory.
 *
 * Exports two clients with different privilege levels:
 * - `createClient()` — cookie-based, anon key, RLS enforced. Use for all user-scoped reads/writes.
 * - `createAdminClient()` — service role key, bypasses RLS. Use ONLY for background jobs or
 *   cross-user queries (e.g. storage operations in API routes that run outside user context).
 *
 * IMPORTANT: Never use `createAdminClient()` for user-scoped reads. Bypassing RLS can expose
 * other users' data. Reserve it for fire-and-forget jobs, storage helpers, and webhook handlers.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a server-side Supabase client scoped to the current user's session.
 *
 * Reads and writes session cookies via Next.js `cookies()` so that RLS policies are
 * automatically applied — each query only sees rows the authenticated user owns.
 *
 * Use this client in Server Components, Route Handlers, and Server Actions wherever
 * you need user-scoped data access.
 */
/**
 * Creates a server-side Supabase client scoped to the current user's session.
 *
 * Reads and writes session cookies via Next.js `cookies()` so that RLS policies are
 * automatically applied — each query only sees rows the authenticated user owns.
 *
 * Use this client in Server Components, Route Handlers, and Server Actions wherever
 * you need user-scoped data access.
 */
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        // Supabase SSR removes cookies by setting them to an empty string
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}

/**
 * Creates a server-side Supabase client authenticated with the service role key.
 *
 * WARNING: This client bypasses Row Level Security entirely. Every query has full
 * read/write access to every row in every table regardless of user ownership.
 *
 * Acceptable uses:
 * - Storage operations in API routes that run outside user context (e.g. `storage.server.ts`)
 * - Background AI jobs (class insights, student profiles) that fan out across multiple users
 * - Webhook handlers (Stripe) that update rows not owned by any single session user
 *
 * Never use this for user-scoped reads in normal request handlers — use `createClient()` instead.
 */
/**
 * Creates a server-side Supabase client authenticated with the service role key.
 *
 * WARNING: This client bypasses Row Level Security entirely. Every query has full
 * read/write access to every row in every table regardless of user ownership.
 *
 * Acceptable uses:
 * - Storage operations in API routes that run outside user context (e.g. `storage.server.ts`)
 * - Background AI jobs (class insights, student profiles) that fan out across multiple users
 * - Webhook handlers (Stripe) that update rows not owned by any single session user
 *
 * Never use this for user-scoped reads in normal request handlers — use `createClient()` instead.
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      // No cookie handling needed — service role auth does not rely on session cookies
      cookies: {
        get() { return undefined },
        set() {},
        remove() {},
      },
    }
  )
}
