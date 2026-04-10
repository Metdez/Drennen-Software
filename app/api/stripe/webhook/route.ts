import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { updateSubscriptionFromWebhook } from '@/lib/db/subscription'
import type Stripe from 'stripe'

/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook receiver — the authoritative source of truth for all
 * subscription status changes. Stripe delivers signed events here whenever
 * a subscription is created, updated, canceled, or a payment succeeds or fails.
 *
 * The endpoint verifies the `Stripe-Signature` header using `STRIPE_WEBHOOK_SECRET`
 * and then updates the `profiles` table via `updateSubscriptionFromWebhook`, which
 * locates the professor by their `stripe_customer_id`.
 *
 * @param request - Raw request body (text, not JSON) required for signature verification.
 *   The `Stripe-Signature` header must be present.
 * @returns `{ received: true }` with status 200 for all successfully processed events
 *   (including unhandled event types). Returns 400 for missing/invalid signatures.
 * @remarks
 *   - **Auth**: None — Stripe signs requests with `STRIPE_WEBHOOK_SECRET`. No session
 *     cookie is used. The signature check IS the authentication.
 *   - **No `export const dynamic`**: Intentionally omitted — this route must read the
 *     raw request body as text, not JSON, for signature verification.
 *   - **Always returns 200** after event processing (even on DB errors) to prevent Stripe
 *     from retrying — duplicate webhook delivery is harder to handle than a missed update.
 *   - **Handled event types**:
 *     - `checkout.session.completed` — sets status to `active` after successful checkout
 *     - `customer.subscription.updated` — syncs status, price ID, and period end date
 *     - `customer.subscription.deleted` — sets status to `canceled`
 *     - `invoice.payment_failed` — sets status to `past_due`
 *     - `invoice.paid` — sets status back to `active` (recovery from past_due)
 * @see {@link lib/db/subscription.ts} — `updateSubscriptionFromWebhook()`
 * @see {@link lib/stripe/index.ts} — `getStripe()`
 */
export async function POST(request: Request) {
  // Read the raw body as text — required for Stripe signature verification.
  // Using request.json() would parse it first, making the signature check fail.
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    // Verify the webhook signature. Prevents forged events from modifying subscription state.
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed: ${message}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // Fired when customer completes Stripe Checkout flow.
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
          const firstItem = subscription.items.data[0]
          await updateSubscriptionFromWebhook(customerId, {
            subscriptionStatus: 'active',
            stripeSubscriptionId: subscription.id,
            subscriptionPriceId: firstItem?.price?.id ?? undefined,
            subscriptionCurrentPeriodEnd: firstItem
              ? new Date(firstItem.current_period_end * 1000).toISOString()
              : undefined,
          })
        }
        break
      }

      // Fired on any subscription change: plan switch, renewal, pause, etc.
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const status = subscription.status === 'active' ? 'active'
          : subscription.status === 'past_due' ? 'past_due'
          : subscription.status === 'canceled' ? 'canceled'
          : subscription.status

        const firstItem = subscription.items.data[0]
        await updateSubscriptionFromWebhook(customerId, {
          subscriptionStatus: status,
          subscriptionPriceId: firstItem?.price?.id ?? undefined,
          subscriptionCurrentPeriodEnd: firstItem
            ? new Date(firstItem.current_period_end * 1000).toISOString()
            : undefined,
        })
        break
      }

      // Fired when a subscription is fully canceled (not just paused).
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        await updateSubscriptionFromWebhook(customerId, {
          subscriptionStatus: 'canceled',
        })
        break
      }

      // Fired when a recurring invoice payment fails — marks subscription as past_due.
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        await updateSubscriptionFromWebhook(customerId, {
          subscriptionStatus: 'past_due',
        })
        break
      }

      // Fired when a recurring invoice is paid — restores active status after past_due.
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        await updateSubscriptionFromWebhook(customerId, {
          subscriptionStatus: 'active',
        })
        break
      }

      default:
        // Unhandled event type — acknowledge receipt without DB write.
        // Stripe expects 200; not returning it triggers retries.
        break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook handler error for ${event.type}: ${message}`)
    // Still return 200 to prevent Stripe from retrying (log and move on)
  }

  return NextResponse.json({ received: true })
}
