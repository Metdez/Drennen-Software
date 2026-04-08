# donor-resolver

## Purpose
Resolves raw donor names from the `donations` table to canonical company entities using the OpenCorporates API, alias lookups, and foreign government detection.

## Key Functions
- `normalizeName(name)` — Lowercases, strips punctuation, collapses whitespace for consistent matching
- `matchForeignGov(rawName)` — Checks if a donor is a known foreign government entity
- `pickBestMatch(results, rawName)` — Selects the highest-confidence OpenCorporates result, preferring US jurisdictions
- `resolveDonorName(rawName, supabase)` — Full resolution pipeline: foreign gov check -> alias lookup -> OpenCorporates search -> entity upsert

## Dependencies
- External: OpenCorporates API v0.4 (see [API_REFERENCE.md § OpenCorporates](../API_REFERENCE.md#6-opencorporates))
- Internal: `lib/ingestion/opencorporates-client.ts`, `lib/utils/logger.ts`, `lib/utils/rate-limiter.ts`

## Data Flow
Raw `donor_name` from `donations` table -> normalization -> foreign gov check -> alias lookup -> OpenCorporates search -> best match selection -> upsert into `entities` table (type='donor') -> return entity ID

## Edge Cases
- Donor names with abbreviations ("Koch Fdn") are handled via `NAME_ALIASES` map
- Foreign government donors bypass OpenCorporates entirely and get tagged as `foreign_gov` industry bucket
- OpenCorporates matches below score 50 are rejected to avoid false positives
- API errors are caught and returned as unresolved (don't crash the batch)

## Changelog
- [2026-04-07] Created — initial implementation
