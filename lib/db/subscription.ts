/**
 * @file lib/db/subscription.ts
 *
 * Database access layer for subscription gate-keeping and Stripe profile management.
 *
 * All subscription state lives on the `profiles` table, which has a 1:1 relationship
 * with `auth.users` and is updated both by the professor (e.g. signing up) and by
 * Stripe webhooks (e.g. subscription renewal, cancellation).
 *
 * Table: `profiles`
 *   Relevant columns: `subscription_status`, `trial_ends_at`, `free_sessions_remaining`,
 *   `stripe_customer_id`, `stripe_subscription_id`, `subscription_price_id`,
 *   `subscription_current_period_end`.
 *
 * Access priority for session generation (checked in order by `checkSubscriptionAccess()`):
 *   1. Active Stripe subscription (`subscription_status = 'active' | 'trialing'`)
 *   2. Trial still valid (`trial_ends_at` in the future)
 *   3. Free sessions remaining (`free_sessions_remaining > 0`)
 *   4. Trial expired
 *   5. Free session already used (legacy users)
 *   6. No subscription at all
 *
 * Mixed client usage:
 *   - `checkSubscriptionAccess()` and `getSubscriptionProfile()` use `createClient()`
 *     (RLS enforced) — read-only paths called in authenticated request context.
 *   - All write operations use `createAdminClient()` — webhook events have no auth cookie;
 *     `decrementFreeSession()` uses the admin client to call the atomic RPC function.
 *
 * Called by:
 *   - app/api/process/route.ts            (POST — checkSubscriptionAccess + decrementFreeSession)
 *   - app/api/subscription/route.ts       (GET — checkSubscriptionAccess + getSubscriptionProfile)
 *   - app/api/stripe/checkout/route.ts    (POST — updateStripeCustomerId after creating customer)
 *   - app/api/stripe/webhook/route.ts     (POST — updateSubscriptionFromWebhook on all subscription events)
 *   - components/layout/PaywallModal.tsx  (client-side via /api/subscription)
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { SubscriptionAccess, SubscriptionProfile } from '@/types'

/**
 * Determines whether the professor is allowed to generate a new session.
 *
 * Reads the professor's `profiles` row and applies the access priority waterfall
 * (described in the file-level comment). Returns a detailed `SubscriptionAccess`
 * object so the caller and client UI can display contextual messaging (e.g.
 * "3 days left on trial" vs "subscribe to continue").
 *
 * Returns `{ canGenerate: false, reason: 'no_subscription' }` if the profile row
 * is missing or the query fails, to fail closed (deny access) rather than fail open.
 *
 * @param userId - The authenticated professor's user ID.
 * @returns `SubscriptionAccess` describing whether generation is allowed and why.
 *
 * Called by: app/api/process/route.ts (POST — gate before running the AI pipeline)
 *            app/api/subscription/route.ts (GET — surface status to client)
 * Table: profiles
 * Client: createClient() — RLS enforced
 */
/**
 * Determines whether the professor is allowed to generate a new session.
 *
 * Reads the professor's `profiles` row and applies a defined access priority waterfall. This waterfall prioritizes an active subscription (including Stripe-managed trial via 'trialing'), then an active internal trial, followed by available free sessions. Returns a detailed `SubscriptionAccess` object to allow the caller and client UI to display contextual messaging (e.g., "3 days left on trial" vs "subscribe to continue").
 *
 * Returns `{ canGenerate: false, reason: 'no_subscription' }` if the profile row is missing or the database query fails. This approach is taken to fail closed (deny access) rather than fail open, ensuring security and preventing unauthorized access.
 *
 * - What it does: Checks a user's subscription status, trial period, and free sessions to decide if they can generate a new session.
 * - Why it is used: To gate access to core application functionality (like AI generation) and provide the UI with detailed subscription status for display.
 * - Important implementation details:
 *   - Queries the `profiles` table for `subscription_status`, `trial_ends_at`, `free_sessions_remaining`, and `stripe_customer_id`.
 *   - Implements a strict priority order for access: Active/Trialing subscription > Active internal trial > Free sessions remaining.
 *   - Uses `createClient()` which enforces Row Level Security (RLS) to ensure users can only access their own profile data.
 *   - Calculates `trialDaysRemaining` for active trials.
 *   - Explicitly handles various denial reasons like `no_subscription`, `trial_expired`, and `free_used`.
 */
export async function checkSubscriptionAccess(userId: string): Promise<SubscriptionAccess> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at, free_sessions_remaining, stripe_customer_id')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return {
      canGenerate: false,
      reason: 'no_subscription',
      trialEndsAt: null,
      trialDaysRemaining: null,
      subscriptionStatus: 'none',
      freeSessionsRemaining: 0,
    }
  }

  const now = new Date()
  const subscriptionStatus = data.subscription_status ?? 'none'
  const trialEndsAt = data.trial_ends_at ? String(data.trial_ends_at) : null
  const freeSessionsRemaining = data.free_sessions_remaining ?? 0

  // 1. Active subscription (includes Stripe-managed trial via 'trialing')
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    return {
      canGenerate: true,
      reason: 'subscribed',
      trialEndsAt,
      trialDaysRemaining: null,
      subscriptionStatus,
      freeSessionsRemaining,
    }
  }

  // 2. Trial still active
  if (trialEndsAt) {
    const trialEnd = new Date(trialEndsAt)
    if (trialEnd > now) {
      const msRemaining = trialEnd.getTime() - now.getTime()
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
      return {
        canGenerate: true,
        reason: 'trial',
        trialEndsAt,
        trialDaysRemaining: daysRemaining,
        subscriptionStatus,
        freeSessionsRemaining,
      }
    }
  }

  // 3. Free sessions remaining
  if (freeSessionsRemaining > 0) {
    return {
      canGenerate: true,
      reason: 'free_session',
      trialEndsAt,
      trialDaysRemaining: null,
      subscriptionStatus,
      freeSessionsRemaining,
    }
  }

  // 4. Trial expired
  if (trialEndsAt) {
    return {
      canGenerate: false,
      reason: 'trial_expired',
      trialEndsAt,
      trialDaysRemaining: 0,
      subscriptionStatus,
      freeSessionsRemaining,
    }
  }

  // 5. Legacy user whose free session was used up
  if (freeSessionsRemaining === 0 && !trialEndsAt) {
    return {
      canGenerate: false,
      reason: 'free_used',
      trialEndsAt,
      trialDaysRemaining: null,
      subscriptionStatus,
      freeSessionsRemaining,
    }
  }

  // 6. No subscription at all
  return {
    canGenerate: false,
    reason: 'no_subscription',
    trialEndsAt,
    trialDaysRemaining: null,
    subscriptionStatus,
    freeSessionsRemaining,
  }
}

/**
 * Atomically decrements the professor's free-session counter by 1.
 *
 * Calls the `decrement_free_session` Postgres RPC function (SECURITY DEFINER)
 * rather than issuing a raw UPDATE to avoid a time-of-check/time-of-use (TOCTOU)
 * race condition where two concurrent uploads could both see `count = 1`, both
 * decrement, and end up at -1.
 *
 * Should only be called after `checkSubscriptionAccess()` returns `reason = 'free_session'`
 * and the session has been successfully saved.
 *
 * @param userId - The professor's user ID.
 * @throws  If the RPC call fails (e.g. counter already at 0, network error).
 *
 * Called by: app/api/process/route.ts (POST — after successful session generation)
 * Table: profiles (via `decrement_free_session` RPC)
 * Client: createAdminClient() — bypasses RLS (RPC mutates the row)
 */
/**
 * Atomically decrements the professor's free-session counter by 1.
 *
 * This function calls a `decrement_free_session` Postgres RPC function which is defined as `SECURITY DEFINER`. This approach is crucial to avoid a time-of-check/time-of-use (TOCTOU) race condition that could occur with a raw SQL `UPDATE`. A TOCTOU race could lead to two concurrent requests both seeing `free_sessions_remaining = 1`, both attempting to decrement, and ultimately resulting in a negative counter (`-1`). The RPC ensures this operation is performed atomically within the database.
 *
 * Should only be called after `checkSubscriptionAccess()` has confirmed `reason = 'free_session'` and the associated session has been successfully saved or processed, ensuring that a free session is only consumed upon successful use.
 *
 * - What it does: Reduces a user's `free_sessions_remaining` count by one.
 * - Why it is used: To accurately and safely track the consumption of free sessions after a user successfully utilizes a feature that consumes one, preventing overselling or incorrect counts due to concurrency issues.
 * - Important implementation details:
 *   - Utilizes a Supabase Admin client (`createAdminClient()`) to call a Postgres RPC function (`decrement_free_session`). This bypasses RLS, which is necessary for the RPC to modify the `profiles` row.
 *   - The RPC function is critical for ensuring atomicity and preventing race conditions.
 *   - Throws an error if the RPC call fails (e.g., if the counter is already 0, or due to network/database issues).
 */
export async function decrementFreeSession(userId: string): Promise<void> {
  const adminClient = createAdminClient()

  // Atomic decrement using RPC to avoid TOCTOU race condition
  const { error } = await adminClient.rpc('decrement_free_session', { user_id: userId })
  if (error) throw new Error(`Failed to decrement free session: ${error.message}`)
}

/**
 * Fetches the full subscription metadata for a professor (Stripe IDs, trial dates, etc.).
 *
 * Used by the `/account` page and `/api/subscription` endpoint to display the
 * professor's current plan, renewal date, and available actions (upgrade, manage, cancel).
 * Returns `null` if the profile row is missing or the query fails.
 *
 * @param userId - The professor's user ID.
 * @returns `SubscriptionProfile` with camelCase fields, or `null` on error / not found.
 *
 * Called by: app/api/subscription/route.ts (GET)
 *            app/(app)/account/page.tsx (via the subscription route)
 * Table: profiles
 * Client: createClient() — RLS enforced (read-only, user sees only their own row)
 */
/**
 * Fetches the full subscription metadata for a professor (including Stripe IDs, subscription status, trial dates, and remaining free sessions).
 *
 * This function is used by the `/account` page and the `/api/subscription` endpoint to display the professor's current plan details, renewal date, and available actions (e.g., upgrade, manage subscription, cancel). It provides a comprehensive view of the user's subscription state.
 *
 * Returns `null` if the profile row is missing, the user is not found, or the database query fails, ensuring graceful handling of missing data.
 *
 * - What it does: Retrieves all relevant subscription details for a specific user from the `profiles` table.
 * - Why it is used: To populate user interfaces and API responses with complete and up-to-date subscription information.
 * - Important implementation details:
 *   - Queries the `profiles` table for a wide range of fields: `stripe_customer_id`, `subscription_status`, `stripe_subscription_id`, `subscription_price_id`, `subscription_current_period_end`, `trial_ends_at`, `free_sessions_remaining`.
 *   - Uses `createClient()` which enforces Row Level Security (RLS), ensuring that a user can only query their own profile's subscription data.
 *   - Maps database snake_case fields to camelCase for the `SubscriptionProfile` return object, aligning with frontend conventions.
 *   - Returns `null` on error or if no data is found for the given `userId`.
 */
export async function getSubscriptionProfile(userId: string): Promise<SubscriptionProfile | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('stripe_customer_id, subscription_status, stripe_subscription_id, subscription_price_id, subscription_current_period_end, trial_ends_at, free_sessions_remaining')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    stripeCustomerId: data.stripe_customer_id ?? null,
    subscriptionStatus: data.subscription_status ?? 'none',
    stripeSubscriptionId: data.stripe_subscription_id ?? null,
    subscriptionPriceId: data.subscription_price_id ?? null,
    subscriptionCurrentPeriodEnd: data.subscription_current_period_end ? String(data.subscription_current_period_end) : null,
    trialEndsAt: data.trial_ends_at ? String(data.trial_ends_at) : null,
    freeSessionsRemaining: data.free_sessions_remaining ?? 0,
  }
}

/**
 * Stores the Stripe customer ID on the professor's profile row.
 *
 * Called once, immediately after `stripe.customers.create()` succeeds during
 * the Stripe Checkout session creation. The customer ID is then used to
 * look up subscription events in the webhook handler.
 *
 * @param userId           - The professor's Supabase user ID.
 * @param stripeCustomerId - The `cus_...` ID returned by the Stripe API.
 * @throws  If the update fails.
 *
 * Called by: app/api/stripe/checkout/route.ts (POST)
 * Table: profiles
 * Client: createAdminClient() — bypasses RLS (write path needs service role)
 */
/**
 * Stores the Stripe customer ID on the professor's profile row in the database.
 *
 * This function is called once, immediately after `stripe.customers.create()` successfully creates a new customer record in Stripe during the initial Stripe Checkout session creation flow. Storing this `stripe_customer_id` is crucial as it links the Supabase user to their Stripe customer record, which is subsequently used by the Stripe webhook handler to identify the corresponding user when processing subscription events (e.g., `customer.subscription.created`).
 *
 * - What it does: Updates the `stripe_customer_id` field for a specific user in the `profiles` table.
 * - Why it is used: To establish a direct link between a user's Supabase profile and their Stripe customer account, enabling subsequent webhook processing and subscription management.
 * - Important implementation details:
 *   - Uses `createAdminClient()` to perform the update, bypassing Row Level Security (RLS). This is necessary because write operations initiated by server-side logic often require service role privileges.
 *   - Targets the `profiles` table and updates the `stripe_customer_id` for the given `userId`.
 *   - Throws an error if the database update fails, ensuring that issues are caught and handled.
 */
export async function updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('id', userId)

  if (error) throw new Error(`Failed to update stripe_customer_id: ${error.message}`)
}

/**
 * Applies Stripe webhook-driven subscription attribute updates to the professor's profile.
 *
 * Called by the Stripe webhook handler (`/api/stripe/webhook`) whenever a subscription
 * lifecycle event fires (e.g. `customer.subscription.created`, `customer.subscription.updated`,
 * `customer.subscription.deleted`, `invoice.payment_succeeded`). The webhook is the
 * single source of truth for subscription status — client-side state is a cache only.
 *
 * Matches the profile by `stripe_customer_id` because webhook events carry the customer ID
 * rather than the Supabase user ID.
 *
 * Only non-`undefined` fields in `updates` are included in the SQL UPDATE payload to avoid
 * accidentally clearing fields that the current webhook event didn't touch.
 *
 * @param stripeCustomerId - The `cus_...` ID from the Stripe event object.
 * @param updates          - Partial set of subscription fields to apply; unset fields are skipped.
 * @throws  If the UPDATE fails.
 *
 * Called by: app/api/stripe/webhook/route.ts (POST — on all subscription/invoice events)
 * Table: profiles
 * Client: createAdminClient() — bypasses RLS (webhook has no auth cookie)
 */
/**
 * Applies Stripe webhook-driven subscription attribute updates to a professor's profile in the database.
 *
 * This function is called by the Stripe webhook handler (`/api/stripe/webhook`) whenever a subscription lifecycle event fires from Stripe (e.g., `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`). The Stripe webhook is treated as the single source of truth for subscription status and related data; any client-side state is considered a cache only and should eventually be synchronized by these events.
 *
 * The profile is matched by `stripe_customer_id` because webhook events from Stripe carry the customer ID, not the internal Supabase user ID. This ensures the correct user's profile is updated.
 *
 * Only non-`undefined` fields within the `updates` object are included in the SQL `UPDATE` payload. This prevents accidentally clearing or overwriting fields that the current webhook event did not intend to modify, allowing for partial updates.
 *
 * - What it does: Synchronizes a user's `profiles` table data with information received from Stripe webhook events.
 * - Why it is used: To maintain an up-to-date and accurate record of user subscription statuses and details within the application's database, reflecting changes originating from Stripe.
 * - Important implementation details:
 *   - Uses `createAdminClient()` because webhook requests do not carry a user's authentication cookie and therefore require service role privileges to bypass RLS for write operations.
 *   - Identifies the target profile using the `stripe_customer_id` provided in the webhook event, which is the primary identifier for linking Stripe data to user profiles.
 *   - Dynamically constructs the update payload (`dbUpdates`) to ensure only explicitly provided (non-`undefined`) fields are updated, preventing unintended data loss.
 *   - Throws an error if the database update fails, crucial for webhook retry mechanisms and error logging.
 */
export async function updateSubscriptionFromWebhook(
  stripeCustomerId: string,
  updates: Partial<{
    subscriptionStatus: string
    stripeSubscriptionId: string
    subscriptionPriceId: string
    subscriptionCurrentPeriodEnd: string
  }>
): Promise<void> {
  const adminClient = createAdminClient()

  const dbUpdates: Record<string, string> = {}
  if (updates.subscriptionStatus !== undefined) dbUpdates.subscription_status = updates.subscriptionStatus
  if (updates.stripeSubscriptionId !== undefined) dbUpdates.stripe_subscription_id = updates.stripeSubscriptionId
  if (updates.subscriptionPriceId !== undefined) dbUpdates.subscription_price_id = updates.subscriptionPriceId
  if (updates.subscriptionCurrentPeriodEnd !== undefined) dbUpdates.subscription_current_period_end = updates.subscriptionCurrentPeriodEnd

  const { error } = await adminClient
    .from('profiles')
    .update(dbUpdates)
    .eq('stripe_customer_id', stripeCustomerId)

  if (error) throw new Error(`Failed to update subscription from webhook: ${error.message}`)
}
