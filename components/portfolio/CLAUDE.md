# components/portfolio/ — Public Portfolio UI

## Purpose

Client-side context provider and navigation shell for the public, token-gated teaching portfolio. Portfolio pages live under `app/(public)/portfolio/[token]/`.

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `PortfolioContext.tsx` | Fetches and distributes portfolio landing data (token, semesters, sessions, sections config) | `app/(public)/portfolio/[token]/layout.tsx` | `GET /api/portfolio/[token]` |
| `PortfolioNav.tsx` | Sticky navigation header for public portfolio pages; hides links for disabled sections | All `app/(public)/portfolio/[token]/` pages | None (reads from `PortfolioContext`) |

## Key Patterns

- `PortfolioProvider` fetches the portfolio config on mount. All child pages consume the data via `usePortfolio()`.
- `PortfolioNav` derives its link list from `data.sections` — links for disabled sections (e.g., `roster=false`) are omitted entirely.
- `usePortfolio()` throws if used outside `PortfolioProvider`.
- Public portfolio routes are read-only presentation layers; no write operations occur here.

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values.
