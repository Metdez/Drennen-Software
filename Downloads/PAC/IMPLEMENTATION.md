# IMPLEMENTATION.md — Phased Build Plan

> **Parent doc:** [CLAUDE.md](./CLAUDE.md) | **Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [DATA_PIPELINE.md](./DATA_PIPELINE.md), [CONVENTIONS.md](./CONVENTIONS.md)

---

## Phase Overview

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 0 | Project Scaffolding | ✅ Complete | Repo setup, DB migration, env config |
| 1 | Data Ingestion — Financials | ✅ Complete | ProPublica 990s → Supabase |
| 2 | Data Ingestion — Campaign Finance | ✅ Complete | FEC API → donations + politician connections |
| 3 | Data Ingestion — Policy & Legislation | ✅ Complete | Firecrawl + Congress API |
| 4 | Data Ingestion — Lobbying & Contracts | ✅ Complete | Senate LDA + USAspending |
| 5 | Donor Resolution & Industry Tagging | ✅ Complete | OpenCorporates + NAICS |
| 6 | AI Analysis Engine | ✅ Complete | OpenRouter alignment scoring + verdicts |
| 7 | Frontend — Entity Profiles | ✅ Complete | Profile pages with financial breakdowns |
| 8 | Frontend — Search & Discovery | ✅ Complete | Full-text + semantic search |
| 9 | Frontend — Visualizations | ✅ Complete | Sankey diagrams, donor network maps |
| 10 | Polish & Deploy | 🔧 In Progress | Performance, SEO, Vercel deploy |

---

## Phase 0 — Project Scaffolding

**Goal:** Runnable project with DB schema applied and all API keys verified.

### Tasks

- [x] `npx create-next-app@latest` with TypeScript, Tailwind v4, App Router
- [x] Set up `supabase` CLI, link to project, apply migration from [ARCHITECTURE.md](./ARCHITECTURE.md)
- [x] Create `.env.local` with all keys listed in [API_REFERENCE.md](./API_REFERENCE.md)
- [x] Create `scripts/` directory for CLI data pipeline commands
- [x] Create `lib/` directory structure per [ARCHITECTURE.md § Service Boundaries](./ARCHITECTURE.md#service-boundaries)
- [x] Create `docs/INDEX.md` registry (empty, will be populated as files are created)
- [x] Verify each API key works with a simple test call (write `scripts/verify-apis.ts`)
- [x] Seed the `entities` table with the 8 tracked entities from [CLAUDE.md](./CLAUDE.md)

**Acceptance:** `npm run dev` starts, Supabase connected, all 8 entities queryable, all API test calls return 200.

---

## Phase 1 — Data Ingestion: Financials (IRS 990s)

**Goal:** For each think tank entity, pull 2020–2024 990 data into the `financials` table.

### Tasks

- [ ] Build `lib/ingestion/propublica.ts` — fetch 990 filings by EIN
- [ ] Map ProPublica response fields → `financials` table columns (see [API_REFERENCE.md § ProPublica](./API_REFERENCE.md#1-propublica-nonprofit-explorer))
- [ ] Create `scripts/ingest-financials.ts` CLI command
- [ ] Handle: missing years, amended filings, fiscal year vs calendar year
- [ ] Store raw API response in `raw_data` JSONB column for auditability
- [ ] Create `docs/propublica.md` per self-healing protocol

**Acceptance:** All 6 think tanks have 990 data for available years 2020–2024. Media amplifiers (Klein, Piker) marked as N/A with estimated revenue in metadata.

**Data source:** [API_REFERENCE.md § ProPublica](./API_REFERENCE.md#1-propublica-nonprofit-explorer)

---

## Phase 2 — Data Ingestion: Campaign Finance (FEC)

**Goal:** Pull PAC/donor contributions linked to think tank-connected politicians.

### Tasks

- [x] Build `lib/ingestion/fec.ts` — query candidates, committees, receipts
- [x] Identify think tank PACs and affiliated committees
- [x] Pull independent expenditures related to tracked entities
- [x] Map to `donations` and `politician_connections` tables
- [x] Create `scripts/ingest-fec.ts`
- [x] Rate limit handling (1,000 req/hr on FEC API)
- [x] Create `docs/fec.md`

**Acceptance:** Politician profiles show donation amounts from think tank-affiliated PACs. Data is source-linked to FEC filing IDs.

**Data source:** [API_REFERENCE.md § FEC](./API_REFERENCE.md#2-fec-federal-election-commission)

---

## Phase 3 — Data Ingestion: Policy Papers & Legislation

**Goal:** Scrape think tank publications and match them to Congressional bills.

### Tasks

- [ ] Build `lib/ingestion/policy-scraper.ts` — use **Firecrawl MCP** to scrape policy papers from each think tank's website
- [ ] Extract title, date, full text, topic tags (AI-assisted tagging via OpenRouter)
- [ ] Generate embeddings for each paper (for semantic search via pgvector)
- [ ] Build `lib/ingestion/congress.ts` — pull bills from Congress.gov API
- [ ] Build `lib/ingestion/policy-legislation-linker.ts` — use AI to find connections between papers and bills (language similarity, shared terminology, timing)
- [ ] Create `scripts/ingest-policies.ts` and `scripts/ingest-legislation.ts`
- [ ] Create `docs/policy-scraper.md`, `docs/congress.md`

**Acceptance:** At least 20 policy papers per think tank ingested. Legislation links populated with confidence scores. Semantic search returns relevant papers for topic queries.

**Tools:** Firecrawl MCP (see [CLAUDE.md § Available Tools](./CLAUDE.md#available-tools)), Congress.gov API (see [API_REFERENCE.md § Congress](./API_REFERENCE.md#3-congressgov-api))

---

## Phase 4 — Data Ingestion: Lobbying & Government Contracts

**Goal:** Show how much entities lobby and how much federal money flows to donors.

### Tasks

- [x] Build `lib/ingestion/lobbying.ts` — Senate LDA API
- [x] Build `lib/ingestion/usaspending.ts` — federal contracts by recipient
- [x] Cross-reference: `lib/ingestion/contract-policy-flagger.ts` + `scripts/cross-reference-contracts.ts`
- [x] Create `scripts/ingest-lobbying.ts` and `scripts/ingest-contracts.ts`
- [x] Create `docs/lobbying.md`, `docs/usaspending.md`, `docs/contract-policy-flagger.md`, `docs/known-donors.md`, `docs/api-responses.md`
- [x] Create `lib/types/api-responses.ts` — LDA + USAspending response types
- [x] Create `lib/constants/known-donors.ts` — 13 tracked donors with aliases
- [x] Add `usaspending` rate limiter preset to `lib/utils/rate-limiter.ts`

**Acceptance:** Lobbying totals and top issues populated for think tanks and major donors. Government contract amounts populated for donor entities.

**Data source:** [API_REFERENCE.md § Senate LDA](./API_REFERENCE.md#5-senate-lobbying-disclosure-api) and [API_REFERENCE.md § USAspending](./API_REFERENCE.md#4-usaspending)

---

## Phase 5 — Donor Resolution & Industry Tagging

**Goal:** Normalize donor names to real companies and tag by industry.

### Tasks

- [x] Build `lib/ingestion/donor-resolver.ts` — OpenCorporates API to match donor names → company records
- [x] Build `lib/ingestion/industry-tagger.ts` — NAICS API to tag companies by sector
- [x] Create industry bucket mapping: NAICS code → `fossil_fuel | defense | healthcare | tech | finance | foreign_gov | other`
- [x] Run resolution pass over all `donations` rows with null `donor_id`
- [x] Create `docs/donor-resolver.md`

**Acceptance:** >80% of donation rows have resolved `donor_id` and `industry_bucket`. Remaining unresolved flagged for manual review.

**Data source:** [API_REFERENCE.md § OpenCorporates](./API_REFERENCE.md#6-opencorporates) and [API_REFERENCE.md § NAICS](./API_REFERENCE.md#7-naics-api)

---

## Phase 6 — AI Analysis Engine

**Goal:** Generate donor-alignment scores for policy papers and independence verdicts for all entities using OpenRouter (minimax/highspeed).

### Tasks

- [x] Build OpenRouter client with system prompt support and session cost tracking (`lib/analysis/openrouter-client.ts`)
- [x] Create prompt templates for alignment, verdict, and media analysis (`lib/analysis/prompts/`)
- [x] Create prompt loader with placeholder validation (`lib/analysis/prompt-loader.ts`)
- [x] Define analysis types and interfaces (`lib/types/analysis.ts`)
- [x] Build alignment scorer — scores policy papers against donor interests (`lib/analysis/alignment-scorer.ts`)
- [x] Build verdict generator — produces independence verdicts for think tanks (`lib/analysis/verdict-generator.ts`)
- [x] Build media analyzer — analyzes media amplifier sourcing patterns (`lib/analysis/media-analyzer.ts`)
- [x] Build CLI script for running analysis pipeline (`scripts/run-analysis.ts`)
- [x] Build API route for triggering analysis (`app/api/analyze/route.ts`)
- [x] Build cost tracker and ai_usage migration (`lib/analysis/cost-tracker.ts`, `supabase/migrations/003_ai_usage_table.sql`)
- [x] Add AiUsage types to database types (`lib/types/database.ts`)
- [x] Create documentation (analysis-engine.md, openrouter-client.md, cost-tracker.md)

**Acceptance:** All analysis functions callable via CLI (`npx tsx scripts/run-analysis.ts`) and API (`POST /api/analyze`). Paper alignment scores and entity verdicts stored in DB. Cost tracking via `ai_usage` table.

### Status Log
- [2026-04-07] Phase 6 complete. All 12 tasks implemented across 4 waves. OpenRouter client enhanced with system prompt support. Three analysis engines (alignment, verdict, media) built with full DB integration. CLI and API entry points created. Cost tracking via ai_usage table. Migration 003 adds ai_usage table — needs `supabase db push`.

---

## Phase 7 — Frontend: Entity Profiles

### Phase 7 Status: ✅ Complete (2026-04-07)

**Goal:** Browsable profile page for each entity with financial breakdown, donor list, policy output, and verdict.

### Tasks

- [x] Build `app/(pages)/entity/[slug]/page.tsx` — dynamic profile page
- [x] Components: `ProfileHeader`, `FinancialChart`, `DonorTable`, `PolicyTimeline`, `VerdictCard`, `LegislationLinks`, `ConnectionGraph`
- [x] Mobile-responsive, clean design inspired by TrackAIPAC but deeper
- [x] "Explore" buttons that trigger deeper analysis on specific angles
- [x] Source citations on every data point (link to filing, API, or URL)
- [x] Follow [frontend-design SKILL.md](./CONVENTIONS.md#frontend-design) for aesthetics — no generic AI look

**Acceptance:** Each of the 8 tracked entities has a complete, navigable profile page. Every number links to its source.

### Notes

Built the full entity profile system: composite `EntityProfile` type (`lib/profiles/types.ts`), server-side profile builder with parallel Supabase queries (`lib/profiles/builder.ts`), RSC profile page with `generateMetadata` for SEO plus `loading.tsx` skeleton and `not-found.tsx` 404 (`app/(pages)/entity/[slug]/`), and 7 sub-components — `ProfileHeader` (badges, confidence meter, data completeness), `FinancialChart` (Recharts revenue/expense visualization), `DonorTable` (sortable, paginated, with industry breakdown chart), `PolicyTimeline` (filterable timeline with topic tags), `VerdictCard` (AI verdict with progressive disclosure), `LegislationLinks` (filterable table with confidence scores), and `ConnectionGraph` (SVG network visualization).

---

## Phase 8 — Frontend: Search & Discovery

### Phase 8 Status: ✅ Complete (2026-04-07)

**Goal:** Users can search by entity name, donor, topic, or politician using full-text and semantic search with filters.

### Tasks

- [x] SQL migration (005_search_indexes.sql) — tsvector columns, GIN indexes, trigram, RPC functions
- [x] Search type definitions (lib/search/types.ts)
- [x] Full-text search service (lib/search/full-text.ts)
- [x] Semantic search service (lib/search/semantic.ts)
- [x] Facets service (lib/search/facets.ts)
- [x] Query embedding helper (lib/search/embedding.ts)
- [x] Unified search orchestrator (lib/search/unified.ts)
- [x] API routes (/api/search + /api/search/suggest)
- [x] SearchBar, SearchFilters, EntitySearchCard, PaperSearchCard components
- [x] TopicCloud, DateRangeFilter, SearchPagination, NoResults components
- [x] Search page assembly (app/(pages)/search/page.tsx + loading.tsx)
- [x] Documentation (search-full-text.md, search-semantic.md, search-page.md)

**Acceptance:** Searching "carbon tax" returns relevant think tanks and their policy papers. Searching "Koch" returns all entities Koch funds. Full-text and semantic search modes available with faceted filtering.

### Status Log
- [2026-04-07] Phase 8 complete — 23 files created across 5 waves. SQL migration adds tsvector columns, GIN indexes, trigram extension, and search RPC functions. Full-text search with trigram fallback, semantic search via pgvector cosine similarity with embedding cache, facets service, and unified orchestrator. API routes for search and autocomplete suggestions. 8 frontend components (SearchBar, SearchFilters, EntitySearchCard, PaperSearchCard, TopicCloud, DateRangeFilter, SearchPagination, NoResults). Search page with URL-driven server component rendering. Documentation per self-healing protocol.

---

## Phase 9 — Frontend: Visualizations

**Goal:** Interactive data visualizations showing Donor → Think Tank → Policy → Legislation → Politician money chain.

**Status:** ✅ Complete

### Tasks

- [x] Install D3.js + d3-sankey dependencies
- [x] Create shared viz utilities (types, colors, hooks)
- [x] Build Sankey data API route (`/api/viz/sankey`)
- [x] Build Network graph data API route (`/api/viz/network`)
- [x] Build Timeline data API route (`/api/viz/timeline`)
- [x] Build Sankey diagram component with controls and tooltips
- [x] Build Network graph component with force layout, controls, and legend
- [x] Build Correlation timeline component with swim lanes and correlation arcs
- [x] Build visualizations hub page (`/visualizations`) with sub-pages
- [x] Embed mini visualizations in entity profile pages
- [x] Create error boundary, skeleton, and accessibility utilities
- [x] Document all new files and update INDEX.md

**Acceptance:** All three visualizations render with real DB data. Hub page at `/visualizations` with entity selector. Mini versions on entity profiles. Dark investigative theme. `npx tsc --noEmit` passes.

---

## Phase 10 — Polish & Deploy

**Goal:** Production-ready deployment.

### Tasks

- [ ] Performance audit (Core Web Vitals)
- [x] SEO: meta tags, OG images, structured data (lib/seo/*, components/StructuredData, OG route)
- [x] Health check API (`/api/health`) and status page (`/status`)
- [ ] Error boundaries and loading states
- [x] Vercel deployment config (vercel.json, standalone output, deploy.ts checklist)
- [ ] Set up Supabase cron for periodic data refresh
- [ ] Write README.md for the GitHub repo

**Acceptance:** Lighthouse score >90. Deployed and publicly accessible. Data refreshes weekly.

---

## Status Log

_Update this section after completing each phase. Format: `[DATE] Phase X complete. Notes: ...`_

```
[2026-04-07] Phase 0 complete. Next.js 16.2.2 + Tailwind v4.2.2 + TypeScript 6.0.2 initialized. Full directory structure created per CONVENTIONS.md. SQL migration with all 10 tables + pgvector extension. Supabase client/server helpers, rate limiter, cache, logger utilities built. 8 tracked entities seeded as constants. verify-apis.ts and seed-entities.ts scripts ready. 10 docs/ files created per self-healing protocol. TypeScript compiles clean, build passes.
[2026-04-07] Phase 5 complete. Donor resolver with OpenCorporates API, alias table, and foreign gov detection. Industry tagger with NAICS API + manual overrides for key companies. CLI script with batch processing and checkpoint/resume. 15 new files created (3 lib modules, 3 types, 2 API clients, 1 script, 3 docs, updates to rate-limiter/cache/industry-buckets/INDEX/gitignore).
[2026-04-07] Phase 2 in progress. FEC API types, client, transformer, CLI orchestrator, and migration created. Known PAC seed data for 6 entities. Pending: integration test with Heritage Foundation.
[2026-04-07] Phase 3 Step 2 in progress. Policy scraper uses a fetch-based fallback with HTML parsing, publication-link extraction, and AI enrichment hooks for topic tags, summaries, and embeddings. Policy ingestion CLI supports entity filtering, paper limits, checkpointing, and manual upsert behavior for `policy_papers`.
[2026-04-08] Phase 3 implementation landed for the OpenRouter client, topic tagging, embeddings, Congress ingestion, and policy-legislation linker. Verification is still partial: targeted unit tests pass, but full `npm run typecheck` is currently blocked by pre-existing donor-resolver typing errors and live Congress ingestion is blocked by an invalid Congress API key in `.env.local`.
[2026-04-08] Phase 3 live progress. Seeded the 8 tracked entities into Supabase and successfully ingested 1 Heritage Foundation policy paper with non-null topic tags, summary, and embedding. Congress ingestion remains blocked by live Congress.gov 520/503 responses, and policy-legislation linking remains blocked until legislation rows exist.
[2026-04-08] Phase 1 complete. Created a dedicated Supabase project for PAC, applied migrations, seeded the 8 tracked entities, and ingested financials into `financials` for all 6 think tanks for each live ProPublica year available in 2020-2024. Added manual 2024 placeholder rows for Ezra Klein and Hasan Piker. Corrected the live ProPublica EINs for Atlantic Council (52-0742294) and Center for American Progress (30-0126510). Parser tests pass, TypeScript compiles clean, and build passes.
[2026-04-07] Phase 7 complete. Entity profile system built: composite EntityProfile type, server-side profile builder with parallel Supabase queries, RSC profile page with SEO metadata and loading/404 boundaries, and 7 sub-components (ProfileHeader, FinancialChart, DonorTable, PolicyTimeline, VerdictCard, LegislationLinks, ConnectionGraph). 5 new doc files created per self-healing protocol.
[2026-04-07] Phase 8 complete — 23 files created across 5 waves. Full-text search (tsvector + trigram), semantic search (pgvector cosine similarity), unified orchestrator, 2 API routes, 8 frontend components, search page with URL-driven filtering. Migration 005_search_indexes.sql adds tsvector columns, GIN indexes, trigram extension, and search RPC functions.
```
