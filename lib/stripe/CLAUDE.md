# lib/stripe/ — Stripe SDK

This directory owns the Stripe client singleton used by server-side billing routes.

## Conventions

- Keep the Stripe SDK creation in one place.
- Use the shared singleton instead of creating ad hoc Stripe instances in routes.
- Treat this as server-only infrastructure.

