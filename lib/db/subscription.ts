import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { SubscriptionAccess, SubscriptionProfile } from '@/types'

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

  // 1. Active subscription
  if (subscriptionStatus === 'active') {
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

  // 5. No subscription at all
  return {
    canGenerate: false,
    reason: 'no_subscription',
    trialEndsAt,
    trialDaysRemaining: null,
    subscriptionStatus,
    freeSessionsRemaining,
  }
}

export async function decrementFreeSession(userId: string): Promise<void> {
  const adminClient = createAdminClient()

  // Read current value, then decrement (minimum 0)
  const { data } = await adminClient
    .from('profiles')
    .select('free_sessions_remaining')
    .eq('id', userId)
    .single()

  if (data && data.free_sessions_remaining > 0) {
    await adminClient
      .from('profiles')
      .update({ free_sessions_remaining: data.free_sessions_remaining - 1 })
      .eq('id', userId)
  }
}

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

export async function updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('id', userId)

  if (error) throw new Error(`Failed to update stripe_customer_id: ${error.message}`)
}

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
