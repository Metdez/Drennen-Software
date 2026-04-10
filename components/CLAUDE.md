# components/ — React Components

## Directory Structure

Components are organized by feature domain:

| Directory | Purpose |
|-----------|---------|
| `session/` | Session display, upload, download, sharing, prompt customization |
| `analytics/` | Analysis panels, theme visualization, synthesis, CollapsiblePanel, WhatChangedBanner, ThemeExplorer |
| `student/` | Roster, profiles, growth, notes, reflections |
| `speaker/` | Speaker briefs, portals, analysis uploads |
| `debrief/` | Post-session debrief capture |
| `semester/` | Semester context, selection, management |
| `subscription/` | Paywall, billing banners, subscription context |
| `layout/` | Navigation, auth forms, config panels |
| `report/` | Semester report sections (ExecutiveSummary, ThemeEvolution, etc.) |
| `compare/` | Session comparison components |
| `portfolio/` | Public portfolio components |
| `ui/` | Shared primitives (Badge, Button, Card, Spinner) |

Several of these feature folders also have their own nested `CLAUDE.md` files so their local conventions stay close to the code.

## Brand Color Rules

**Never hardcode hex values.** Import brand constants from `@/lib/constants`:

```ts
import { BRAND } from '@/lib/constants'

// BRAND.ORANGE  → #f36f21  (primary action, highlights, CTAs)
// BRAND.PURPLE  → #542785  (secondary accent, debrief/reflection theme)
// BRAND.GREEN   → #0f6b37  (success, speaker analysis, career connections)
```

Use these constants in inline styles and className strings:
```tsx
// ✅ Correct
style={{ background: BRAND.ORANGE }}
className={`border-[${BRAND.PURPLE}]/40`}

// ❌ Wrong — hardcoded hex
style={{ background: '#f36f21' }}
```

CSS variable theme tokens (`var(--text-primary)`, `var(--surface)`, `var(--border-accent)`, etc.) are defined in `app/globals.css` and should be used for theme-sensitive values (text, backgrounds, borders) so that light/dark modes work correctly.

## Component Patterns

### File-level header comment

Every component file must have a comment block immediately after `'use client'` that specifies:
- What the component renders
- Which page or parent component renders it (`Rendered by:`)
- Which API routes it calls directly (`Calls:`)
- Which React contexts it reads (`Reads:`)

```ts
/**
 * MyComponent — one-line description.
 *
 * Rendered by: app/(app)/some-page/page.tsx
 * Calls: GET /api/some-route, POST /api/other-route
 * Reads: SemesterContext
 */
```

### JSDoc on exported functions and interfaces

Add JSDoc to every exported component function and every `interface Props`:
- `@param` or inline prop descriptions covering every non-obvious prop
- One-sentence summary of what the component renders
- Note any conditional render branches (null states, loading states, error states)

### Inline comments on non-obvious logic

Add inline `//` comments for:
- Optimistic UI updates (label them as such + describe the revert strategy)
- `localStorage`/`sessionStorage` keys (explain what is stored and why)
- Context reads that affect rendering in a non-obvious way
- Guard clauses that prevent a section from rendering

### Error handling

- Never use `alert()` for errors — all error feedback must be inline UI state
- API routes that call Gemini must use `extractErrorMessage()` from `lib/utils/errors.ts`
- Upload pipelines must surface auth-expiry errors as inline text

### Cross-reference conventions in comments

```
// Rendered by: app/(app)/...
// Calls: /api/...
// Reads: SemesterContext / SubscriptionContext / PortfolioContext
```

## Subdirectory Reference

### `analytics/`

| File | Purpose |
|------|---------|
| `AnalysisPanelLeft.tsx` | Theme clusters (clickable deep-dive) + underlying tensions |
| `AnalysisPanelRight.tsx` | Gemini Suggests, Blind Spots, Student Sentiment |
| `CollapsiblePanel.tsx` | Generic accordion used across analytics and preview pages |
| `SynthesisPanel.tsx` | Cross-data synthesis requiring 2+ submission types |
| `ThemeExplorer.tsx` | Ranked theme list with expand-to-detail |
| `ThemeFrequencyPanel.tsx` | Self-contained bar chart; fetches GET /api/analytics/themes |
| `WhatChangedBanner.tsx` | "What's New" diff banner; persists seen-state in localStorage |

### `compare/`

| File | Purpose |
|------|---------|
| `ComparativeNarrative.tsx` | AI narrative + key differences + recommendations |
| `ComparisonHeader.tsx` | Side-by-side session identity header with VS divider |
| `ComparisonShareButton.tsx` | Share/revoke token button; null if sessionIds missing |
| `ParticipationDelta.tsx` | Student overlap breakdown (both/only-A/only-B) |
| `QualityComparison.tsx` | Grouped bar chart for tier distributions |
| `SentimentComparison.tsx` | Horizontal grouped bar chart + delta indicators |
| `ThemeVenn.tsx` | Three-column Venn-style theme overlap display |

### `report/`

| File | Purpose |
|------|---------|
| `AppendixRoster.tsx` | Full attendance grid for semester report appendix |
| `BlindSpots.tsx` | Blind spot cards + recommendations section |
| `ExecutiveSummary.tsx` | Key metrics stat cards + narrative + highlights |
| `QuestionQuality.tsx` | Tier distribution stacked bar chart with trend indicator |
| `SemesterGlance.tsx` | Stats, submissions-over-time chart, tier distribution bars |
| `SessionSummaries.tsx` | Per-session summary cards with theme pills |
| `SpeakerEffectiveness.tsx` | Speaker rankings table (avg tier + debrief rating) |
| `StudentEngagement.tsx` | Participation tiers, top contributors, drop-off list |
| `StudentGrowth.tsx` | Narrative + growth highlight cards |
| `ThemeEvolution.tsx` | Timeline with hash-assigned colors + dominant themes table |

### `semester/`

| File | Purpose |
|------|---------|
| `SemesterContext.tsx` | Global semester filter; syncs active semester to `?semester=` URL param |
| `SemesterSelector.tsx` | Dropdown pill; reads SemesterContext; no props |
| `AssignSessionsModal.tsx` | Bulk-assign unassigned sessions to a semester |
| `SemesterManageModal.tsx` | Create/edit semester modal (archives current on create) |
| `SemesterOnboardingBanner.tsx` | First-time banner; dismissed state in localStorage |

### `student/`

| File | Purpose |
|------|---------|
| `RosterTable.tsx` | Roster with flagged group + main table; row click navigates to detail |
| `StudentDetailTabs.tsx` | Three-tab layout: Profile / Growth / Submissions |
| `StudentProfileTab.tsx` | Interests + Career Direction + Personality cards |
| `StudentGrowthTab.tsx` | GrowthIntelligencePanel + ProfessorNotesEditor |
| `GrowthIntelligencePanel.tsx` | 4 growth dimension cards + AI recommendations (pure display) |
| `ProfessorNotesEditor.tsx` | CRUD notes with optimistic updates; flags for follow-up |
| `StudentReflectionsPanel.tsx` | Debrief analysis display (pure display, no fetch) |

### `speaker/`

| File | Purpose |
|------|---------|
| `GenerateBriefButton.tsx` | Generate/view speaker brief; probes GET on mount |
| `GeneratePortalButton.tsx` | Create/view speaker portal; probes GET on mount |
| `SpeakerAnalysisPanel.tsx` | Speaker evaluation analysis display (pure display, no fetch) |
| `SpeakerAnalysisUploadZone.tsx` | ZIP upload pipeline for student speaker analyses |
| `StudentDebriefUploadZone.tsx` | ZIP upload pipeline for student post-session debriefs |

### `portfolio/`

| File | Purpose |
|------|---------|
| `PortfolioContext.tsx` | Client-side data store for a public portfolio page; fetches /api/portfolio/[token] |
| `PortfolioNav.tsx` | Sticky nav for public portfolio; links generated from enabled sections |
