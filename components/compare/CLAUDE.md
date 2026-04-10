# components/compare/ — Session Comparison UI

## Purpose

Side-by-side session comparison components: header, charts (Venn, sentiment, quality, participation delta), AI narrative, and the comparison share button.

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `ComparisonHeader.tsx` | Side-by-side session identity header (speaker names, dates, file counts, VS divider) | `app/(app)/compare/page.tsx`, `app/(public)/shared/compare/[token]/page.tsx` | None (data passed as prop) |
| `ComparisonShareButton.tsx` | Creates/revokes a comparison share token and copies the URL | `app/(app)/compare/page.tsx` | `POST/DELETE /api/compare/share` |
| `ComparativeNarrative.tsx` | AI-generated narrative, key differences, and recommendations panel | `app/(app)/compare/page.tsx`, `app/(public)/shared/compare/[token]/page.tsx` | None (data + `onGenerate` callback passed as props) |
| `ThemeVenn.tsx` | Overlapping themes Venn diagram (unique to A / shared / unique to B) | `app/(app)/compare/page.tsx` | None (data passed as prop) |
| `SentimentComparison.tsx` | Side-by-side sentiment breakdown bars for both sessions | `app/(app)/compare/page.tsx` | None (data passed as prop) |
| `QualityComparison.tsx` | Question quality tier comparison (Tier 1–4 distribution) | `app/(app)/compare/page.tsx` | None (data passed as prop) |
| `ParticipationDelta.tsx` | Participation change visualization between sessions | `app/(app)/compare/page.tsx` | None (data passed as prop) |

## Key Patterns

- `ComparativeNarrative` has three states: empty (Generate button), generating (pulse skeleton), and populated (narrative + diff grid).
- The `DIMENSION_COLORS` map in `ComparativeNarrative` provides color-coded badges for key difference dimensions; falls back to `engagement` colors for unknown keys.
- `ComparisonShareButton` renders null when `comparisonId` is null (comparison not yet saved).
- Public shared compare view (`shared/compare/[token]`) receives `readOnly=true` — interactive controls (Generate, Share) are hidden.

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values.
