# health-checks

## What it does
Provides individual and aggregate health check functions for monitoring the Think Tank Influence Tracker's operational status.

## Key exports

| Export | Purpose |
|--------|---------|
| `checkDatabase()` | Pings Supabase with a lightweight query, returns status + latency |
| `checkEntities()` | Counts entities, compares against expected total (8) |
| `checkLastRefresh()` | Queries `refresh_logs` for the most recent completed run |
| `checkApiKeys()` | Checks which env vars are set (booleans only, never values) |
| `runAllHealthChecks()` | Runs all checks in parallel, returns combined result |
| `getRecentRefreshRuns(n)` | Fetches last N refresh log entries |
| `deriveOverallStatus(checks)` | Maps check results to `healthy` / `degraded` / `unhealthy` |

## Files
- `lib/monitoring/health-checks.ts` — all check logic
- `app/api/health/route.ts` — public GET endpoint returning JSON
- `app/(pages)/status/page.tsx` — server-rendered status dashboard

## Dependencies
- `lib/supabase/server.ts` (`createServiceRoleClient`)

## Edge cases
- `refresh_logs` table may not exist yet (migration 006). All queries to it are wrapped in try/catch and return graceful fallbacks.
- API key check never exposes actual values, only boolean presence.
