/**
 * @file types/subscription.ts
 * @description Stripe subscription and access-gating types.
 *
 * Session generation is gated by `checkSubscriptionAccess()` in
 * `lib/db/subscription.ts`. Users start with a 3-day trial or 1 free session.
 * Full access requires an active Stripe subscription.
 *
 * Subscription state is stored in the `profiles` table alongside the user's
 * Stripe metadata and exposed through:
 *   GET  /api/subscription        → SubscriptionAccess (used by SubscriptionContext)
 *   POST /api/stripe/checkout     → creates Stripe Checkout session
 *   POST /api/stripe/portal       → creates Stripe Billing Portal session
 *   POST /api/stripe/webhook      → updates profiles table from Stripe events
 *
 * The `SubscriptionContext` in the (app) layout provides client-side access to
 * `SubscriptionAccess` so components can conditionally show upgrade prompts.
 *
 * All types here are Domain types (no DB Row equivalent — the `profiles` table
 * contains these fields individually, not as a JSONB blob).
 */

/**
 * Access control result for the session generation endpoint.
 * Returned by `checkSubscriptionAccess()` and GET /api/subscription.
 * Used by `SubscriptionContext` and the upload form to gate the generate button.
 */
/**
 * This interface defines the current access status for a professor to generate new sessions. It consolidates various factors like subscription, trial, and free session availability into a clear, actionable structure.
 *
 * It is used throughout the application, primarily by API endpoints and UI components, to determine if a user can generate a new session and to provide appropriate feedback or restrict functionality. It ensures a consistent way to evaluate a professor's current privileges.
 *
 * Key implementation details include: the `canGenerate` boolean which provides an immediate overall access decision; the `reason` enum which offers a granular explanation for the access status; and specific fields like `trialEndsAt`, `trialDaysRemaining`, and `freeSessionsRemaining` that give detailed context for the current state. The `subscriptionStatus` provides the raw Stripe status for deeper integration or debugging.
 */
export interface SubscriptionAccess {
  /** Whether this professor is currently allowed to generate a new session. */
  canGenerate: boolean
  /**
   * The reason that determines access:
   *   'subscribed'      — active Stripe subscription
   *   'trial'           — within the 3-day free trial window
   *   'free_session'    — has at least 1 free session remaining
   *   'trial_expired'   — trial has ended with no subscription
   *   'no_subscription' — never subscribed (and trial expired or never started)
   *   'free_used'       — free session allowance exhausted
   */
  reason: 'subscribed' | 'trial' | 'free_session' | 'trial_expired' | 'no_subscription' | 'free_used'
  /** ISO timestamp of when the trial ends; null if the user is not in a trial. */
  trialEndsAt: string | null
  /** Days remaining in the trial; null if not in a trial. */
  trialDaysRemaining: number | null
  /** Raw Stripe subscription status string (e.g. 'active', 'canceled', 'past_due'). */
  subscriptionStatus: string
  /** How many free sessions the professor has left before a subscription is required. */
  freeSessionsRemaining: number
}

/**
 * Professor's Stripe billing profile data, stored in `profiles` fields.
 * Returned by `getSubscriptionProfile()` and used by the /account billing page.
 */
/**
 * This interface defines the structure for storing a professor's Stripe billing profile data, typically persisted in a `profiles` database table.
 *
 * It is used to retrieve and manage essential billing-related information for a professor, enabling features such as displaying subscription details on an account page, processing webhook events from Stripe, and making decisions based on the user's billing history. It provides a standardized contract for interacting with user billing data.
 *
 * Important implementation details include: `stripeCustomerId` and `stripeSubscriptionId` for direct integration with the Stripe API; `subscriptionPriceId` to identify the active plan; `subscriptionCurrentPeriodEnd` for displaying billing cycle information; and `trialEndsAt` to track the initial trial period. `freeSessionsRemaining` indicates remaining free session allowance, often managed atomically by a database function. Nullable fields indicate the absence of a specific Stripe resource or state (e.g., no customer ID if never checked out).
 */
export interface SubscriptionProfile {
  /** Stripe customer ID (cus_xxx); null if the professor has never checked out. */
  stripeCustomerId: string | null
  /** Raw Stripe subscription status string. */
  subscriptionStatus: string
  /** Stripe subscription ID (sub_xxx); null if no active subscription. */
  stripeSubscriptionId: string | null
  /** Stripe Price ID of the active plan (monthly or annual); null if unsubscribed. */
  subscriptionPriceId: string | null
  /** ISO timestamp of when the current billing period ends; null if unsubscribed. */
  subscriptionCurrentPeriodEnd: string | null
  /** ISO timestamp of when the trial ends; null if the user never had a trial. */
  trialEndsAt: string | null
  /** Remaining free sessions (decremented atomically by `decrement_free_session` SQL function). */
  freeSessionsRemaining: number
}
