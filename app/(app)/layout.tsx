/**
 * Protected app layout (`app/(app)/layout.tsx`).
 *
 * Wraps every authenticated page with:
 * - `SubscriptionProvider` — exposes subscription state to all child components
 * - `SemesterProvider` — exposes active semester and semester list
 * - `NavHeader` — top navigation bar with route links and user menu
 * - `SubscriptionBanner` — inline trial/expired warning banner
 *
 * `force-dynamic` ensures auth checks run on every request (no caching).
 * Actual auth enforcement happens in `middleware.ts` before this layout renders.
 */
import { SemesterProvider } from '@/components/semester/SemesterContext'
import { SubscriptionProvider } from '@/components/subscription/SubscriptionContext'
import { NavHeader } from '@/components/layout/NavHeader'
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner'

/**
 * What it does: Forces dynamic rendering for the entire page/layout.
 * Why it is used: To ensure that data fetching and rendering happen on demand at request time, rather than at build time or being cached. This is crucial for applications with frequently changing data or user-specific content, ensuring users always see up-to-date information.
 * Important implementation details: This export configures Next.js to opt out of static rendering optimizations for all routes and components within this layout, effectively making the entire section of the app render dynamically on the server for each request.
 */
export const dynamic = 'force-dynamic'

/**
 * What it does: Serves as the root layout for the application's main content, providing a consistent structure and global context providers.
 * Why it is used: To wrap the entire application content (`children`) with essential components like a navigation header, a subscription banner, and global context providers (for semester and subscription information). This ensures that these elements are available and consistently rendered across all pages within the `(app)` route group, centralizing common UI and state management.
 * Important implementation details: 
 * - It wraps `children` within `SubscriptionProvider` and `SemesterProvider` to make subscription and semester data globally accessible to all nested components.
 * - It includes `NavHeader` for consistent application-wide navigation and `SubscriptionBanner` to display subscription-related messages or alerts.
 * - The main content area (`<main>`) is styled with a maximum width, centered horizontally, and includes padding for a clean layout.
 * - The root `div` sets a minimum height to ensure the layout spans the full viewport height and uses a CSS variable (`--bg`) for the background color, allowing for theme-based styling.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{background: 'var(--bg)'}}>
      <SubscriptionProvider>
        <SemesterProvider>
          <NavHeader />
          <main className="max-w-4xl mx-auto px-6 py-10">
            <SubscriptionBanner />
            {children}
          </main>
        </SemesterProvider>
      </SubscriptionProvider>
    </div>
  )
}
