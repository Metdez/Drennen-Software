# IMPLEMENTATION.md — Phased Build Plan

> **Parent doc:** [CLAUDE.md](./CLAUDE.md) | **Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [DATA_PIPELINE.md](./DATA_PIPELINE.md), [CONVENTIONS.md](./CONVENTIONS.md)

---

## Phase Overview

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 0 | Project Scaffolding | ✅ Complete | Repo setup, DB migration, env config |
| 1 | Data Ingestion — Financials | ⬜ Not Started | ProPublica 990s → Supabase |
| 2 | Data Ingestion — Campaign Finance | ⬜ Not Started | FEC API → donations + politician connections |
| 3 | Data Ingestion — Policy & Legislation | ⬜ Not Started | Firecrawl + Congress API |
| 4 | Data Ingestion — Lobbying & Contracts | ⬜ Not Started | Senate LDA + USAspending |
| 5 | Donor Resolution & Industry Tagging | ✅ Complete | OpenCorporates + NAICS |
| 6 | AI Analysis Engine | ⬜ Not Started | OpenRouter alignment scoring + verdicts |
| 7 | Frontend — Entity Profiles | ⬜ Not Started | Profile pages with financial breakdowns |
| 8 | Frontend — Search & Discovery | ⬜ Not Started | Full-text + semantic search |
| 9 | Frontend — Visualizations | ⬜ Not Started | Sankey diagrams, donor network maps |
| 10 | Polish & Deploy | ⬜ Not Started | Performance, SEO, Vercel deploy |

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

- [ ] Build `lib/ingestion/fec.ts` — query candidates, committees, receipts
- [ ] Identify think tank PACs and affiliated committees
- [ ] Pull independent expenditures related to tracked entities
- [ ] Map to `donations` and `politician_connections` tables
- [ ] Create `scripts/ingest-fec.ts`
- [ ] Rate limit handling (1,000 req/hr on FEC API)
- [ ] Create `docs/fec.md`

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

- [ ] Build `lib/ingestion/lobbying.ts` — Senate LDA API
- [ ] Build `lib/ingestion/usaspending.ts` — federal contracts by recipient
- [ ] Cross-reference: if a donor has federal contracts, and a think tank they fund pushes policy that benefits that contract, flag it
- [ ] Create `scripts/ingest-lobbying.ts` and `scripts/ingest-contracts.ts`
- [ ] Create `docs/lobbying.md`, `docs/usaspending.md`

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

**Goal:** Generate donor-alignment scores for policy papers and overall verdicts for entities.

### Tasks

- [ ] Build `lib/analysis/alignment-scorer.ts` — for each policy paper, compare the paper's recommendations against the known interests of the entity's top donors. Score 0.0 (independent) to 1.0 (fully aligned). See [DATA_PIPELINE.md § AI Analysis Prompts](./DATA_PIPELINE.md#ai-analysis-prompts) for prompt templates.
- [ ] Build `lib/analysis/verdict-generator.ts` — aggregate all evidence for an entity and generate an overall verdict (donor_captured / partially_captured / mostly_independent / independent)
- [ ] Build `lib/analysis/media-analyzer.ts` — for media amplifiers, analyze sourcing patterns and think tank citation frequency
- [ ] All AI calls go through `lib/analysis/openrouter-client.ts` — centralized, with retry logic and cost tracking
- [ ] Store verdicts in `analysis_verdicts` table with rationale and evidence
- [ ] Create `docs/analysis-engine.md`

**Acceptance:** Every entity has a verdict. Every policy paper has an alignment score. Rationale text is specific, evidence-based, and cites actual donor names and policy positions.

---

## Phase 7 — Frontend: Entity Profiles

**Goal:** Browsable profile page for each entity with financial breakdown, donor list, policy output, and verdict.

### Tasks

- [ ] Build `app/(pages)/entity/[slug]/page.tsx` — dynamic profile page
- [ ] Components: `ProfileHeader`, `FinancialChart`, `DonorTable`, `PolicyTimeline`, `VerdictCard`, `LegislationLinks`, `ConnectionGraph`
- [ ] Mobile-responsive, clean design inspired by TrackAIPAC but deeper
- [ ] "Explore" buttons that trigger deeper analysis on specific angles
- [ ] Source citations on every data point (link to filing, API, or URL)
- [ ] Follow [frontend-design SKILL.md](./CONVENTIONS.md#frontend-design) for aesthetics — no generic AI look

**Acceptance:** Each of the 8 tracked entities has a complete, navigable profile page. Every number links to its source.

---

## Phase 8 — Frontend: Search & Discovery

**Goal:** Users can search by entity name, donor, topic, or politician.

### Tasks

- [ ] Build `app/(pages)/search/page.tsx`
- [ ] Implement Supabase full-text search + pgvector semantic search
- [ ] Search results show entity cards with verdict badges
- [ ] Topic filter (dropdown or tag cloud)
- [ ] Date range filter

**Acceptance:** Searching "carbon tax" returns relevant think tanks and their policy papers. Searching "Koch" returns all entities Koch funds.

---

## Phase 9 — Frontend: Visualizations

**Goal:** Interactive data visualizations that make the money → policy chain visible.

### Tasks

- [ ] Sankey diagram: Donor $ → Think Tanks → Policy Areas → Politicians
- [ ] Network graph: entity connections (who funds whom, who cites whom)
- [ ] Timeline: policy paper publication → legislation introduction correlation
- [ ] Use D3.js or Recharts (both available in Next.js)

**Acceptance:** At least one Sankey and one network graph rendered with real data. Interactive (hover for details, click to navigate to profile).

---

## Phase 10 — Polish & Deploy

**Goal:** Production-ready deployment.

### Tasks

- [ ] Performance audit (Core Web Vitals)
- [ ] SEO: meta tags, OG images, structured data
- [ ] Error boundaries and loading states
- [ ] Deploy to Vercel
- [ ] Set up Supabase cron for periodic data refresh
- [ ] Write README.md for the GitHub repo

**Acceptance:** Lighthouse score >90. Deployed and publicly accessible. Data refreshes weekly.

---

## Status Log

_Update this section after completing each phase. Format: `[DATE] Phase X complete. Notes: ...`_

```
[2026-04-07] Phase 0 complete. Next.js 16.2.2 + Tailwind v4.2.2 + TypeScript 6.0.2 initialized. Full directory structure created per CONVENTIONS.md. SQL migration with all 10 tables + pgvector extension. Supabase client/server helpers, rate limiter, cache, logger utilities built. 8 tracked entities seeded as constants. verify-apis.ts and seed-entities.ts scripts ready. 10 docs/ files created per self-healing protocol. TypeScript compiles clean, build passes.
[2026-04-07] Phase 5 complete. Donor resolver with OpenCorporates API, alias table, and foreign gov detection. Industry tagger with NAICS API + manual overrides for key companies. CLI script with batch processing and checkpoint/resume. 15 new files created (3 lib modules, 3 types, 2 API clients, 1 script, 3 docs, updates to rate-limiter/cache/industry-buckets/INDEX/gitignore).
```
