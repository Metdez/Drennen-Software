# app/ — Next.js App Router

This directory contains all route groups, layouts, pages, and API handlers for the app.

## Route Groups

| Directory | Purpose |
|-----------|---------|
| `(app)/` | Authenticated professor experience behind the app shell |
| `(auth)/` | Login and authentication entry points |
| `(public)/` | Token-based public views with no auth required |
| `api/` | Route handlers for data, AI, and exports |

## Conventions

- Keep `page.tsx` files thin: fetch or derive data in the smallest practical layer, then render components.
- Auth checks live in `(app)/layout.tsx` or route handlers, not in every leaf page.
- API routes use `export const dynamic = 'force-dynamic'` so auth and per-request data stay fresh.
- Public routes should assume only token-based access and avoid session-only dependencies.
- When adding a new route, update the root `CLAUDE.md` route structure and the relevant nested docs.

## Key Files

- `app/page.tsx` — redirects users to the authenticated shell or login flow.
- `app/layout.tsx` — root document shell, fonts, and global metadata.
- `(app)/layout.tsx` — protected shell with the navigation header.
- `(public)/layout.tsx` — public shell for shareable URLs.
- `(auth)/login/page.tsx` — email/password entry point.

