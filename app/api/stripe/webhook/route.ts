import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { updateSubscriptionFromWebhook } from '@/lib/db/subscription'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed: ${message}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
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

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        await updateSubscriptionFromWebhook(customerId, {
          subscriptionStatus: 'canceled',
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        await updateSubscriptionFromWebhook(customerId, {
          subscriptionStatus: 'past_due',
        })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        await updateSubscriptionFromWebhook(customerId, {
          subscriptionStatus: 'active',
        })
        break
      }

      default:
        // Unhandled event type — acknowledge receipt
        break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook handler error for ${event.type}: ${message}`)
    // Still return 200 to prevent Stripe from retrying
  }

  return NextResponse.json({ received: true })
}
