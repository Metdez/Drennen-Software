# Think Tank Influence Tracker

**Follow the money from donors to policy.**

<!-- ![Build](https://img.shields.io/github/actions/workflow/status/YOUR_ORG/think-tank-tracker/ci.yml?branch=main) -->
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## What Is This?

Think Tank Influence Tracker is a public-interest web platform that maps the financial relationships between corporate and foreign donors, Washington D.C. policy think tanks, media amplifiers, and U.S. legislation. It answers a simple question: **when a think tank publishes a policy paper, whose money is behind it?**

The platform uses AI to analyze whether think tank policy output aligns with donor interests rather than independent evidence. Every data point is sourced from public filings, government databases, and official disclosures — the AI interprets patterns, it never fabricates data.

```
Donor ($) ──→ Think Tank ──→ Policy Paper ──→ Legislation / Media Amplifier ──→ Politician
```

This project tracks entities across the political spectrum — left, right, center, and libertarian — with equal rigor. Credibility depends on balanced coverage.

---

## Tracked Entities

| Entity | Type | Key Angle |
|--------|------|-----------|
| Heritage Foundation | Think Tank | Project 2025, corporate & conservative donors |
| Brookings Institution | Think Tank | Qatar funding, Wall Street & tech |
| Center for American Progress | Think Tank | Healthcare donor conflicts |
| Cato Institute | Think Tank | Koch network, independence test |
| Council on Foreign Relations | Think Tank | Elite capture, Carlyle Group |
| Atlantic Council | Think Tank | Foreign government & defense contractor funding |
| Ezra Klein | Media Amplifier | Abundance agenda, tech oligarch alignment |
| Hasan Piker | Media Amplifier | Sourcing standards, misinformation record |

---

## How It Works

### Data Sources

- **ProPublica Nonprofit Explorer** — IRS 990 filings for revenue, expenses, and compensation
- **FEC Campaign Finance API** — Political contributions and donor records
- **Congress.gov API** — Legislation text, sponsors, and status
- **Senate LDA (Lobbying Disclosure Act)** — Lobbying registrations and activity reports
- **USAspending.gov** — Federal contracts and grants
- **Firecrawl** — Web scraping for policy papers, publications, and public pages

### AI Analysis

The platform uses OpenRouter-powered AI to:

1. **Score donor alignment** — Compare policy paper recommendations against known donor interests
2. **Generate independence verdicts** — Assess whether a think tank's output tracks donor agendas or demonstrates intellectual independence
3. **Detect patterns** — Surface correlations between funding changes and policy shifts over time

### Frontend

Built with Next.js 16 and Tailwind v4. Progressive disclosure: summary cards lead to detailed entity pages, which link to raw source documents. Every claim links back to its data source.

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- API keys (see `.env.example`)

### Setup

```bash
git clone https://github.com/YOUR_ORG/think-tank-tracker.git
cd think-tank-tracker
cp .env.example .env.local    # fill in API keys
npm install
supabase start                # start local Supabase stack
supabase db reset             # apply all migrations
npm run dev                   # http://localhost:3000
```

### Available Scripts

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
npm run typecheck    # TypeScript type checking
```

---

## Data Ingestion

Scripts in `scripts/` handle data collection and processing. Run them with `npx tsx`:

| Script | Purpose |
|--------|---------|
| `seed-entities.ts` | Seed initial think tanks and media amplifiers |
| `ingest-financials.ts` | Pull IRS 990 data from ProPublica |
| `ingest-fec.ts` | Fetch FEC campaign finance records |
| `ingest-legislation.ts` | Import bills from Congress.gov |
| `ingest-lobbying.ts` | Pull lobbying disclosures from Senate LDA |
| `ingest-contracts.ts` | Fetch federal contracts from USAspending |
| `ingest-policies.ts` | Scrape policy papers from think tank websites |
| `resolve-donors.ts` | Match and deduplicate donor records |
| `link-policies-legislation.ts` | Connect policy papers to related legislation |
| `cross-reference-contracts.ts` | Cross-reference contracts with donor entities |
| `run-analysis.ts` | Run AI alignment and independence analysis |
| `trigger-refresh.ts` | Trigger a full data refresh cycle |
| `verify-apis.ts` | Verify all API keys and endpoints are working |
| `audit-env.ts` | Audit environment variable configuration |

Example:

```bash
npx tsx scripts/seed-entities.ts
npx tsx scripts/ingest-financials.ts
npx tsx scripts/run-analysis.ts
```

---

## Architecture

The system follows a three-layer pattern:

- **Data Layer** — Supabase (PostgreSQL + pgvector) stores entities, financial records, policy papers, legislation, and AI-generated analysis
- **Ingestion Layer** — TypeScript scripts fetch from public APIs and scrape websites, normalizing data into the database
- **Presentation Layer** — Next.js App Router with React Server Components renders the frontend, pulling data via Supabase client

For full system design, database schema, and service boundaries, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with clear, focused commits
4. Run quality checks: `npm run lint && npm run typecheck`
5. Open a pull request against `main`

Please keep PRs small and focused. If your change touches multiple files, describe the reasoning in the PR description.

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

## Disclaimer

- **AI-generated analysis**: Alignment scores and independence verdicts are produced by AI models interpreting public data. They represent analytical estimates, not definitive conclusions. Always verify claims against the linked source documents.
- **Data sources**: All financial data comes from public filings (IRS 990s, FEC records, lobbying disclosures, federal contracts). Data accuracy depends on the completeness and timeliness of these public sources.
- **Balanced coverage**: This platform tracks entities across the full political spectrum. Inclusion of any entity does not imply wrongdoing — the goal is transparency, not accusation.
- **Not legal or financial advice**: Nothing on this platform constitutes legal, financial, or investment advice.
