# Refresh Orchestrator

Automated weekly data refresh pipeline that runs all ingestion steps in sequence and logs progress to `refresh_logs`.

## Key Files

| File | Purpose |
|------|---------|
| `lib/refresh/types.ts` | TypeScript interfaces for RefreshStep, RefreshRun, RefreshOptions |
| `lib/refresh/orchestrator.ts` | Sequentially runs all 8 ingestion steps with logging |
| `scripts/trigger-refresh.ts` | CLI entry point: `npx tsx scripts/trigger-refresh.ts` |
| `supabase/migrations/006_refresh_logs.sql` | Creates `refresh_logs` table |

## Steps (in order)

1. `financials` — Financial data (990 filings)
2. `fec` — FEC contribution data
3. `lobbying` — Senate LDA lobbying disclosures
4. `contracts` — USAspending government contracts
5. `policies` — Policy paper scraping
6. `legislation` — Congress.gov legislation
7. `donors` — Donor name resolution
8. `analysis` — AI alignment/verdict analysis

## Usage

```bash
# Run all steps
npx tsx scripts/trigger-refresh.ts

# Run specific steps only
npx tsx scripts/trigger-refresh.ts --steps financials,fec

# Force re-run (flag passed to orchestrator for future use)
npx tsx scripts/trigger-refresh.ts --force
```

## Cron Scheduling

The project does not use Supabase Edge Functions. Weekly cron should be configured via:
- **Supabase Dashboard** → Database → Cron Jobs (pg_cron), or
- An external scheduler (GitHub Actions, cron on a server) that runs the trigger script.

## Dependencies

- `dotenv` (loads `.env.local`)
- `@supabase/supabase-js` (via `createServiceRoleClient`)

## Current State

All steps are **placeholder stubs** — they log intent but do not call actual ingestion scripts. Wire real script imports when ready.
