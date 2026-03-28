export interface SubscriptionAccess {
  canGenerate: boolean
  reason: 'subscribed' | 'trial' | 'free_session' | 'trial_expired' | 'no_subscription' | 'free_used'
  trialEndsAt: string | null
  trialDaysRemaining: number | null
  subscriptionStatus: string
  freeSessionsRemaining: number
}

export interface SubscriptionProfile {
  stripeCustomerId: string | null
  subscriptionStatus: string
  stripeSubscriptionId: string | null
  subscriptionPriceId: string | null
  subscriptionCurrentPeriodEnd: string | null
  trialEndsAt: string | null
  freeSessionsRemaining: number
}
