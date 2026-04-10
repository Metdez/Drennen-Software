/**
 * @file types/user.ts
 * @description Authenticated user types derived from Supabase Auth.
 *
 * The app uses Supabase email/password auth. The full Supabase `User` object
 * is available from the auth client, but most of the app only needs `id` and
 * `email`. `AuthUser` is a minimal projection for that purpose.
 *
 * See also: `lib/db/users.ts` — `getCurrentUser()` returns an `AuthUser`.
 */

/**
 * Minimal representation of the currently authenticated professor.
 * Derived from the Supabase auth session; does not contain subscription or
 * profile data (see `SubscriptionProfile` in subscription.ts for those fields).
 */
/**
 * Defines the structure for an authenticated user within the application.
 * This interface is used to ensure type safety and consistency when handling user objects that have successfully passed authentication. It provides a clear, immutable contract for the essential data associated with a logged-in user.
 *
 * Important implementation details:
 * - It includes fundamental properties like `id` (a unique identifier for the user) and `email` (the primary email address associated with the account).
 * - This type is foundational for any user-related operations, state management, or API responses that involve authenticated user data.
 */
export interface AuthUser {
  id: string
  email: string
}
