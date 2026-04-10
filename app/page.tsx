/**
 * Root entry page (`/`).
 *
 * Server-side redirect: authenticated users go to `/dashboard`,
 * unauthenticated users go to `/login`. No UI is rendered directly.
 *
 * Calls: lib/db/users — getCurrentUser()
 */
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db/users'

/**
 * What it does: This constant is a Next.js specific export that forces the page to be dynamically rendered on every request.
 * Why it is used: It is used to ensure that the user's session status is always checked fresh, preventing any stale redirects that might occur if the page were statically generated or cached. This is crucial for authentication-dependent routing.
 * Important implementation details: Setting `dynamic = 'force-dynamic'` overrides the default static rendering behavior that Next.js might otherwise apply to a page, guaranteeing server-side execution for each request.
 */
export const dynamic = 'force-dynamic'

/**
 * What it does: This is the default page component for the application's root URL (`/`). Its primary function is to immediately route users to the appropriate section of the application based on their authentication status.
 * Why it is used: It serves as the initial gateway for all users accessing the application's root. By checking the user's session, it directs authenticated users to their dashboard and unauthenticated users to the login page, providing a seamless and secure entry point.
 * Important implementation details: This is an `async` function, allowing it to perform asynchronous operations like fetching the current user's session from the database. It leverages Next.js's `redirect` function from `next/navigation` to perform a server-side redirect, which is efficient as it avoids rendering the root page content and immediately sends a new HTTP location header to the client. It relies on the `getCurrentUser` utility to ascertain the user's logged-in status.
 */
export default async function RootPage() {
  // Resolve session from cookies; redirect accordingly
  const user = await getCurrentUser()
  redirect(user ? '/dashboard' : '/login')
}
