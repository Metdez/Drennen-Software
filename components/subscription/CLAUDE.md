# components/subscription/ — Access and Billing UI

## Purpose

Client-side subscription state provider, access-gating banners, and the Stripe checkout modal. These components are the UI face of the Stripe billing integration — Stripe webhooks remain the source of truth for actual subscription status.

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `SubscriptionContext.tsx` | React Context + Provider caching `SubscriptionAccess` (canGenerate, reason, trial status) | `app/(app)/layout.tsx` | `GET /api/subscription` |
| `SubscriptionBanner.tsx` | Trial countdown / expired / free-used banner that opens `PaywallModal` | `app/(app)/dashboard/page.tsx` (top of page) | None (uses `SubscriptionContext`; PaywallModal calls Stripe) |
| `PaywallModal.tsx` | Full-screen modal with monthly ($25/mo) and annual ($20/mo) Stripe checkout cards | Opened by `SubscriptionBanner` and inline paywalls | `POST /api/stripe/checkout` |

## Key Patterns

- `SubscriptionContext` is a client-side cache only. Never treat it as authoritative; always let Stripe webhooks update the `profiles` table.
- `SubscriptionBanner` dismissal is `sessionStorage`-based for trial banners (clears on tab close) but non-dismissible for `trial_expired` and `free_used` states.
- `PaywallModal` redirects the entire window to the Stripe Checkout URL on plan selection (`window.location.href = data.url`).
- Errors from the Stripe checkout API are surfaced inline in the modal; `alert()` is never used.
- `useSubscription()` hook throws if used outside `SubscriptionProvider`.

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values.
