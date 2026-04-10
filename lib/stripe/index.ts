/**
 * Stripe SDK singleton factory.
 *
 * Instantiating the Stripe SDK is not free — it validates the API key and sets up
 * internal state. This module lazily creates a single shared instance on first use
 * and reuses it for all subsequent calls within the same server process.
 *
 * Usage: import `getStripe` from this module in every route handler or utility that
 * needs the Stripe SDK. Never instantiate `new Stripe(...)` directly elsewhere.
 *
 * Environment variable required: `STRIPE_SECRET_KEY` (server-only, never expose to client).
 */
import Stripe from 'stripe'

/** Lazily-initialised Stripe SDK instance. `null` until first call to `getStripe()`. */
/**
 * What it does: A lazily-initialised Stripe SDK instance.
 * Why it is used: To hold the singleton instance of the Stripe client, ensuring that the client is only created once and reused across the application.
 * Important implementation details: It is `null` until the `getStripe()` function is called for the first time, implementing a lazy initialization pattern.
 */
let _stripe: Stripe | null = null

/**
 * Returns the shared Stripe SDK instance, creating it on first call.
 *
 * The `apiVersion` is pinned to `'2026-03-25.dahlia'` to ensure webhook event shapes
 * and API responses stay stable even when Stripe releases new API versions. Update
 * this value deliberately when migrating to a new Stripe API version.
 *
 * @returns The singleton `Stripe` client configured with the server-side secret key.
 */
/**
 * What it does: Returns the shared Stripe SDK instance.
 * Why it is used: To provide a consistent, single point of access to the Stripe API client throughout the application, preventing redundant object creation and ensuring a uniform configuration.
 * Important implementation details:
 * - It implements a singleton pattern, creating the `Stripe` instance only on the first call.
 * - It initializes the Stripe client using `process.env.STRIPE_SECRET_KEY!`, assuming the environment variable is always present.
 * - The `apiVersion` is explicitly pinned to `'2026-03-25.dahlia'` to maintain stability in webhook event shapes and API responses.
 * - Developers are expected to update the `apiVersion` deliberately when migrating to a new Stripe API version to avoid unexpected breaking changes.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // Pinned API version — update intentionally when migrating Stripe API versions
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}
