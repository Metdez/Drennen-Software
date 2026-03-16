# CLAUDE.md — Glasswing Deal Research Tool

## PROJECT SUMMARY

We are building a deal research tool for Kleida Martiro, a VC at Glasswing Ventures. The user pastes a company URL, the backend scrapes the website and runs it through Claude for analysis, and the frontend displays a structured deal research brief. After the brief loads, the user can generate a first-draft investment memo (the internal VC document format) with one click — Claude produces a 9-section memo in ~15 seconds. The memo feature is a separate API call (`POST /api/memo`) independent of the research workflow.

The backend workflow engine is **SpreadJam's jam-nodes** — an open-source TypeScript workflow framework. This is the specific tool Kleida asked to be evaluated, so using it is intentional and important.

---

## TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | latest (15.x) |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^3.4 |
| Workflow engine | @jam-nodes/core | 0.2.10 |
| Node library | @jam-nodes/nodes | 0.2.10 |
| Schema validation | zod | ^3.22 |
| Deployment | Vercel (serverless) | — |

No database. No auth. No Express. No state management library.

---

## ENVIRONMENT VARIABLES

```
FIRECRAWL_API_KEY=fc-xxxxx    # Website scraping — https://firecrawl.dev
ANTHROPIC_API_KEY=sk-ant-xxxxx # Claude AI analysis — https://console.anthropic.com
NIMBLE_API_KEY=xxxxx           # Google SERP via NimbleWay — https://nimbleway.com (optional — skip if absent)
APOLLO_API_KEY=xxxxx           # Org enrichment + news articles — https://apollo.io (optional — skip if absent)
```

These live in `.env.local` at the project root. Never hardcode them. Access via `process.env.FIRECRAWL_API_KEY` and `process.env.ANTHROPIC_API_KEY` in server-side code only.

---

## PROJECT STRUCTURE

```
glasswing-research/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← Root layout (fonts, metadata, dark theme)
│   │   ├── page.tsx                ← Main page (state: idle → loading → done → memo)
│   │   ├── globals.css             ← Tailwind + CSS custom properties
│   │   └── api/
│   │       ├── research/
│   │       │   └── route.ts        ← POST handler — validates URL, calls workflow
│   │       ├── memo/
│   │       │   └── route.ts        ← POST handler — generates investment memo from brief
│   │       └── chat/
│   │           └── route.ts        ← POST handler — brief Q&A chat
│   ├── lib/
│   │   ├── types.ts                ← SHARED TYPES (every file imports from here)
│   │   ├── workflow.ts             ← jam-nodes workflow (scrape → analyze)
│   │   └── prompts.ts              ← Claude system prompt + user prompt builder
│   └── components/
│       ├── SearchForm.tsx           ← URL input + Analyze button
│       ├── ResearchBrief.tsx        ← Full brief display + Generate Memo CTA
│       ├── BriefSection.tsx         ← Single section card (with color variants)
│       ├── LoadingState.tsx         ← Animated loading with step indicators
│       ├── InvestmentMemo.tsx       ← Investment memo renderer (copy + back)
│       └── BriefChat.tsx            ← Q&A chat on the research brief
├── .env.local                       ← API keys (gitignored)
├── CLAUDE.md                        ← THIS FILE
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## SHARED TYPES (src/lib/types.ts)

Every file in this project imports from this file. Build it first.

```typescript
// Key interfaces — see src/lib/types.ts for full definitions

export interface NewsArticle {
  title: string; url: string; source: string;
  snippet: string; publishedAt: string; categories: string[];
}

export interface ResearchBriefSections {
  companyOverview: string; foundingTeam: string; product: string;
  targetMarket: string; competitiveLandscape: string; redFlags: string;
  glasswingRelevance: string; searchPresence: string; aiConsensus: string;
  recentEvents: string;       // ← Apollo news timeline analysis
  newsAndPress: string;       // ← NimbleWay news coverage
  hiringSignal: string;       // ← Apollo job postings analysis
  fundingAnalysis: string;    // ← funding trajectory
  techStackAnalysis: string;  // ← tech stack signals
  networkOpportunity: string; // ← warm intro paths
  competitorComparison: string;
  competitiveMoat: string;  // ← AI analysis of defensibility (NimbleWay moat search)
}

export interface MemoResponse {
  success: boolean;
  memo?: string;
  error?: string;
}

export interface CompetitorComparison {
  name: string;
  domain: string;
  employeeCount: number;
  annualRevenue: string;
  totalFunding: string;
  latestFundingStage: string;
  foundedYear: number;
  industry: string;
}

export interface ResearchBrief {
  companyName: string;
  companyUrl: string;
  scrapedAt: string;
  sections: ResearchBriefSections;
  metadata: { pageTitle: string; pageDescription: string; sourceUrl: string; };
  // Optional enrichment data (present when Apollo API key is configured)
  apolloNewsArticles?: NewsArticle[];    // ← raw Apollo news articles for timeline UI
  jobPostings?: JobPosting[];
  totalJobPostings?: number;
  orgEnrichment?: OrgEnrichment;
  competitorData?: CompetitorComparison[];  // ← top 3 competitors enriched via Apollo
  companyLeadership?: NetworkPerson[];
  companyAlumni?: NetworkPerson[];
  // Optional AI platform raw responses
  chatgptSays?: string;
  perplexitySays?: string;
  newsResults?: NewsResult[];
  newsAiSummary?: string;
}
```

---

## JAM-NODES REFERENCE (SpreadJam v0.2.10)

### Documentation URLs
- Homepage: https://docs.spreadjam.com
- Quick Start: https://docs.spreadjam.com/quickstart
- Creating Custom Nodes: https://docs.spreadjam.com/creating-nodes
- Core API — ExecutionContext: https://docs.spreadjam.com/core/execution-context
- Core API — NodeRegistry: https://docs.spreadjam.com/core/registry
- Core API — Types: https://docs.spreadjam.com/core/types
- Built-in Nodes Overview: https://docs.spreadjam.com/nodes/overview
- Integration Nodes: https://docs.spreadjam.com/nodes/integration
- AI Nodes: https://docs.spreadjam.com/nodes/ai
- Logic Nodes: https://docs.spreadjam.com/nodes/logic
- Transform Nodes: https://docs.spreadjam.com/nodes/transform
- GitHub: https://github.com/wespreadjam/jam-nodes

### Installation
```
npm install @jam-nodes/core@0.2.10 @jam-nodes/nodes@0.2.10 zod
```

### Core Imports
```typescript
import { NodeRegistry, ExecutionContext } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';
```

### Creating a Registry
```typescript
const registry = new NodeRegistry();
registry.registerAll(builtInNodes);
```

### Getting a Node Executor
```typescript
const executor = registry.getExecutor('http_request');
```

### Creating an ExecutionContext
```typescript
const ctx = new ExecutionContext({ companyUrl: 'https://example.com' });
```

### ExecutionContext Methods
```typescript
ctx.setVariable('name', value);              // Set a variable
ctx.getVariable('name');                     // Get a variable
ctx.hasVariable('name');                     // Check existence
ctx.deleteVariable('name');                  // Delete
ctx.getAllVariables();                        // Get copy of all variables
ctx.mergeVariables({ a: 1, b: 2 });         // Merge multiple
ctx.storeNodeOutput('nodeId', output);       // Store node output + merge keys to root
ctx.getNodeOutput('nodeId');                 // Retrieve stored output
ctx.interpolate('Hello {{name}}');           // Resolve {{var}} in string
ctx.interpolateObject({ url: '{{apiUrl}}'}); // Recursively interpolate object
ctx.resolveNestedPath('user.name');          // Dot-notation path resolution
ctx.evaluateJsonPath('$.user.name');         // JSONPath evaluation
ctx.toNodeContext('userId', 'workflowId');   // Create context for executor
ctx.toJSON();                                // Export variables
ExecutionContext.fromJSON(json);             // Restore from JSON
```

### Running a Node
```typescript
const result = await executor(
  {
    url: 'https://api.example.com/data',
    method: 'POST',
    headers: { 'Authorization': 'Bearer key', 'Content-Type': 'application/json' },
    body: { key: 'value' },
    timeout: 30000,
  },
  ctx.toNodeContext('user-123', 'wf-456')
);

// result shape:
// {
//   success: boolean,
//   output?: {
//     status: number,
//     statusText: string,
//     headers: Record<string, string>,
//     body: unknown,        ← parsed JSON or text
//     ok: boolean,
//     durationMs: number
//   },
//   error?: string
// }
```

### http_request Node — Input Schema
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| url | string (URL) | yes | — | URL to request |
| method | 'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE' | no | 'GET' | HTTP method |
| headers | Record<string, string> | no | — | Request headers |
| body | unknown | no | — | JSON-serialized for POST/PUT/PATCH |
| timeout | number | no | 30000 | Timeout in ms (1000–60000) |

### http_request Node — Output Schema
| Field | Type | Description |
|-------|------|-------------|
| status | number | HTTP status code |
| statusText | string | Status text |
| headers | Record<string, string> | Response headers |
| body | unknown | Parsed response (JSON or text) |
| ok | boolean | Whether status is 2xx |
| durationMs | number | Request duration |

### All 16 Built-in Nodes
| Category | Nodes |
|----------|-------|
| Logic | conditional, end, delay |
| Transform | map, filter |
| Integration | http_request, reddit_monitor, twitter_monitor, linkedin_monitor, search_contacts, draft_emails |
| AI | social_ai_analyze, sora_video, seo_keyword_research, seo_audit, social_keyword_generator |

### Credential Slots (available via context.credentials)
| Service | Fields |
|---------|--------|
| anthropic | apiKey |
| apollo | apiKey |
| twitter | bearerToken, twitterApiIoKey |
| forumScout | apiKey |
| dataForSeo | apiToken (Base64) |
| openai | apiKey |

### Variable Interpolation
Use `{{variableName}}` syntax in node inputs. If the entire string is one reference, the actual value (not stringified) is returned.
```typescript
ctx.setVariable('apiUrl', 'https://api.example.com');
ctx.interpolate('{{apiUrl}}/users'); // "https://api.example.com/users"
ctx.interpolate('{{items}}');        // returns actual array, not "[1,2,3]"
```

### Node Output Chaining
When you call `ctx.storeNodeOutput('scrape', result)`, the output object's keys are merged into the root variable scope. This means downstream nodes can reference them via interpolation.

---

## FIRECRAWL API REFERENCE (v2)

### Documentation URLs
- API Docs: https://docs.firecrawl.dev/api-reference/endpoint/scrape
- Dashboard (get API key): https://firecrawl.dev
- Free tier: 500 credits (1 scrape = 1 credit)

### Scrape Endpoint
```
POST https://api.firecrawl.dev/v2/scrape
```

### Request Headers
```
Authorization: Bearer <FIRECRAWL_API_KEY>
Content-Type: application/json
```

### Request Body (what we send)
```json
{
  "url": "https://company-to-research.com",
  "formats": ["markdown"],
  "onlyMainContent": true
}
```

### Key Request Parameters
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| url | string (URI) | required | The URL to scrape |
| formats | string[] | ["markdown"] | Output formats: markdown, html, rawHtml, screenshot, links, json, summary |
| onlyMainContent | boolean | true | Strip headers/navs/footers |
| waitFor | integer | 0 | Extra ms to wait for JS rendering |
| timeout | integer | 30000 | Request timeout (max 300000) |
| mobile | boolean | false | Emulate mobile device |

### Successful Response (200)
```json
{
  "success": true,
  "data": {
    "markdown": "# Company Name\n\nClean markdown content of the website...",
    "metadata": {
      "title": "Company Name — Tagline",
      "description": "Meta description from the page",
      "language": "en",
      "sourceURL": "https://company-to-research.com",
      "url": "https://company-to-research.com",
      "statusCode": 200
    }
  }
}
```

### How We Access the Response in jam-nodes
After the http_request executor runs, the Firecrawl response is nested inside the node output:
```typescript
const scrapeBody = scrapeResult.output as any;
const markdown = scrapeBody?.body?.data?.markdown;       // the clean text
const metadata = scrapeBody?.body?.data?.metadata || {};  // title, description, etc.
```
Note: `scrapeResult.output.body` is the parsed HTTP response body. Inside that is Firecrawl's `{ success, data: { markdown, metadata } }` structure.

---

## APOLLO API REFERENCE

### Org Enrichment
```
POST https://api.apollo.io/api/v1/organizations/enrich
Headers: Content-Type: application/json, Cache-Control: no-cache, X-Api-Key: <APOLLO_API_KEY>
Body: { "domain": "acme.com" }
Response: { "organization": { "id": "xxx", "name": "...", "founded_year": 2020, ... } }
```
The `organization.id` is required for news articles and job postings calls.

### News Articles Search
```
POST https://api.apollo.io/api/v1/news_articles/search
Body: { "organization_ids": ["ORG_ID"], "per_page": 10, "page": 1 }
Response: { "news_articles": [{ "id", "url", "domain", "title", "snippet", "published_at", "event_categories" }] }
```
`event_categories` values: `hires`, `investment`, `contract`, `partnership`, `product_launch`, `expansion`, `acquisition`

### Job Postings
```
GET https://api.apollo.io/api/v1/organizations/{ORG_ID}/job_postings?per_page=10
Response: { "organization_job_postings": [{ "title", "url", "country", "posted_at" }] }
```

### People Search
```
POST https://api.apollo.io/api/v1/mixed_people/search
Body: { "api_key": "...", "q_organization_domains": ["acme.com"], "person_titles": ["CEO", "CTO", ...], "per_page": 10 }
Response: { "people": [{ "first_name", "last_name", "title", "organization", "linkedin_url", "city", "state" }] }
```

All Apollo nodes are **optional and non-fatal** — if `APOLLO_API_KEY` is absent or any call fails, the workflow continues with empty data.

---

## ANTHROPIC MESSAGES API REFERENCE

### Documentation URLs
- API Reference: https://docs.anthropic.com/en/api/messages
- Console (get API key): https://console.anthropic.com
- Model: claude-sonnet-4-20250514

### Create Message Endpoint
```
POST https://api.anthropic.com/v1/messages
```

### Request Headers
```
x-api-key: <ANTHROPIC_API_KEY>
anthropic-version: 2023-06-01
Content-Type: application/json
```

### Request Body (what we send)
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 2000,
  "system": "You are a senior VC analyst at Glasswing Ventures...",
  "messages": [
    {
      "role": "user",
      "content": "Analyze this company website and produce a deal research brief..."
    }
  ]
}
```

### Key Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| model | string | yes | Model ID — use "claude-sonnet-4-20250514" |
| max_tokens | integer | yes | Max tokens in response (we use 2000) |
| system | string | no | System prompt (VC analyst persona) |
| messages | array | yes | Array of {role, content} message objects |

### Successful Response (200)
```json
{
  "id": "msg_xxxx",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "{ \"companyName\": \"Example Corp\", \"sections\": { ... } }"
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 800
  }
}
```

### How We Access the Response in jam-nodes
```typescript
const analysisBody = analysisResult.output as any;
const responseText = analysisBody?.body?.content?.[0]?.text;  // the JSON string
const parsed = JSON.parse(responseText);                       // parse to object
```

---

## FRONTEND DESIGN DIRECTION

### Aesthetic
Dark, editorial, professional. Bloomberg Terminal meets premium VC dashboard. NOT generic startup white/purple. This is for a VC professional.

### Color Palette (use as CSS custom properties)
```css
:root {
  --bg-primary: #0a0a0f;
  --bg-surface: #13131a;
  --border-subtle: rgba(255, 255, 255, 0.06);
  --accent-blue: #4f8cff;
  --accent-red: #ff4f4f;
  --accent-green: #4fff8c;
  --text-primary: #e8e8ed;
  --text-secondary: #6b6b80;
}
```

### Typography
- Headings: JetBrains Mono (monospace, technical VC feel)
- Body: IBM Plex Sans (clean, readable)
- Load via next/font/google

### Component Patterns
- Surface cards: `bg-[#13131a] border border-white/[0.06] rounded-lg`
- Section labels: uppercase, monospace, text-xs, tracking-wider, text-secondary
- The footer MUST include: "Powered by SpreadJam (jam-nodes) · Firecrawl · Claude"

### Page States
1. **idle** — SearchForm visible, no results
2. **loading** — SearchForm disabled + LoadingState with animated steps
3. **done** — SearchForm (for new search) + ResearchBrief with all 7 sections

### API Contract (frontend ↔ backend)
```
POST /api/research
Content-Type: application/json

Request:  { "url": "https://somecompany.com" }
Response: { "success": true, "brief": { ...ResearchBrief } }
          { "success": false, "error": "Error message" }
```

---

## WORKFLOW ARCHITECTURE

The backend is a single Next.js API route (`/api/research`) that runs a jam-nodes workflow with up to 6 chained `http_request` nodes:

```
[User submits URL]
        ↓
[API Route validates URL]
        ↓
[Node 1: http_request → Firecrawl /v2/scrape]
   Input: company URL
   Output: clean markdown of website + metadata
        ↓
   ctx.storeNodeOutput('scrape', result)
        ↓
[Node 2: http_request → NimbleWay /v1/agents/run (google_search)] ← optional, skipped if NIMBLE_API_KEY absent
   Input: company name (derived from page title or URL hostname)
   Output: Google SERP as markdown (organic results, ads, snippets)
        ↓
   ctx.storeNodeOutput('googleSerp', result)
        ↓
[Node 3: http_request × 2 (parallel) → NimbleWay /v1/agents/run (chatgpt + perplexity)] ← optional
   Input: company name query
   Output: AI platform responses as markdown
        ↓
   ctx.storeNodeOutput('chatgptResponse' | 'perplexityResponse', result)
        ↓
[Node 4: http_request → Apollo /api/v1/organizations/enrich] ← optional, skipped if APOLLO_API_KEY absent
   Input: domain extracted from company URL (e.g. "acme.com")
   Output: org metadata including organization.id
        ↓
   ctx.storeNodeOutput('orgEnrichment', result)
        ↓
[Node 5: http_request → Apollo /api/v1/news_articles/search] ← only runs if Node 4 returned an org ID
   Input: organization_ids: [orgId], per_page: 10
   Output: up to 10 categorized news articles (hires, investment, partnership, etc.)
        ↓
   ctx.storeNodeOutput('newsArticles', result)
        ↓
[Node 6: http_request → Apollo /api/v1/organizations/{id}/job_postings] ← only runs if Node 4 returned an org ID
   Input: organizationId from Node 4, per_page: 10
   Output: up to 10 active job postings (title, url, country, posted_at)
        ↓
   ctx.storeNodeOutput('jobPostings', result)
        ↓
[Node 7: http_request → NimbleWay /v1/search (news)] ← optional, skipped if NIMBLE_API_KEY absent
   Input: company name + "latest news funding", last 12 months
   Output: news results + AI summary
        ↓
   ctx.storeNodeOutput('newsSearch', result)
        ↓
[Node 9: Competitor Discovery — 3 sub-steps] ← optional, requires NIMBLE_API_KEY + APOLLO_API_KEY
   9A: http_request → NimbleWay /v1/search (general)
       Input: "{companyName} top competitors alternatives"
       Output: answer text summarizing top competitors
   9B: http_request → Anthropic /v1/messages (claude-haiku, 200 tokens)
       Input: search answer → extract top 3 competitor domain names as JSON array
       Output: ["competitor1.com", "competitor2.com", "competitor3.com"]
   9C: http_request × 3 (parallel) → Apollo /api/v1/organizations/enrich
       Input: each competitor domain
       Output: org metadata for each competitor
        ↓
   ctx.storeNodeOutput('competitors', enrichResults)
   competitorData: CompetitorComparison[] assembled from Apollo responses
        ↓
[Node 10: http_request → Anthropic /v1/messages]
   Input: markdown + SERP + AI responses + Apollo news + job postings + competitor comparison data + VC analyst prompt
   Output: structured JSON deal brief (16 sections incl. competitorComparison analysis)
        ↓
   Parse JSON → return ResearchBrief (+ apolloNewsArticles + jobPostings + competitorData) to frontend
```

The NodeRegistry and builtInNodes are initialized once at module level (reused across requests). A fresh ExecutionContext is created per request.

---

## AGENT ASSIGNMENTS

### Agent 4 — SHARED TYPES (run first, 2 minutes)
- **File:** `src/lib/types.ts`
- **Why first:** Every other file imports from here

### Agent 3 — WORKFLOW ENGINE
- **Files:** `src/lib/workflow.ts`, `src/lib/prompts.ts`
- **Depends on:** `src/lib/types.ts`
- **Reads:** jam-nodes reference + Firecrawl API reference + Anthropic API reference (all in this file above)

### Agent 2 — API ROUTE
- **File:** `src/app/api/research/route.ts`
- **Depends on:** `src/lib/types.ts`, `src/lib/workflow.ts`
- **Reads:** Workflow result types (in this file above)

### Agent 1 — FRONTEND
- **Files:** All of `src/components/*`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`
- **Depends on:** `src/lib/types.ts`
- **Reads:** Frontend design direction + API contract (in this file above)
- No backend knowledge needed — just knows `POST /api/research` with `{ url }` returns `ResearchResponse`

### File Ownership (no overlaps)
```
Agent 1 owns: layout.tsx, page.tsx, globals.css, SearchForm.tsx, ResearchBrief.tsx, BriefSection.tsx, LoadingState.tsx
Agent 2 owns: api/research/route.ts
Agent 3 owns: lib/workflow.ts, lib/prompts.ts
Agent 4 owns: lib/types.ts
```

No two agents write to the same file. No merge conflicts.

---

## DEPLOYMENT (Vercel)

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard:
   - `FIRECRAWL_API_KEY`
   - `ANTHROPIC_API_KEY`
4. Set the serverless function timeout: the API route has `export const maxDuration = 60`
5. Deploy

---

## CONTEXT FOR KLEIDA

Glasswing Ventures is an AI/ML-focused VC firm. Kleida described these pain points on the call:
- Deal research is manual and scattered across tools (Box, Granola, Affinity, email)
- Competitive landscape research is time-consuming
- No centralized way to search past research
- Network mapping (who do we know at this company) is manual

This tool solves pain point #1 and #2. The footer attribution to SpreadJam shows Zack evaluated the tool she asked him to check out and built on top of it.