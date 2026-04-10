/**
 * Public layout (`app/(public)/layout.tsx`).
 *
 * Minimal shell used by all token-gated public pages: shared sessions,
 * shared comparisons, speaker portals, and portfolio sub-pages.
 *
 * Auth: none required. Access control is entirely token-based — the token
 * in the URL is the only gate. No NavHeader, no SubscriptionProvider.
 *
 * The `(public)` route group itself applies no `force-dynamic` directive
 * because each child page is already a Client Component that fetches on
 * mount; caching is not a concern here.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <main className="max-w-4xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  )
}
