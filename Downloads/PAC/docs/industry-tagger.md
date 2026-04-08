# industry-tagger

## Purpose
Tags resolved donor entities with a NAICS industry code and maps it to a simplified industry bucket (fossil_fuel, defense, tech, finance, healthcare, foreign_gov, other).

## Key Functions
- `tagIndustry(companyName, existingNaicsCode)` — Determines the NAICS code and bucket for a company via manual overrides, existing codes, or NAICS API search
- `tagUntaggedDonations(supabase, batchSize)` — Bulk operation: finds resolved donations without industry tags and tags them

## Dependencies
- External: NAICS API v0 (see [API_REFERENCE.md § NAICS](../API_REFERENCE.md#7-naics-api))
- Internal: `lib/ingestion/naics-client.ts`, `lib/constants/industry-buckets.ts`, `lib/utils/logger.ts`

## Data Flow
Company name -> manual override check -> existing NAICS code check -> NAICS API keyword search -> `getIndustryBucket()` mapping -> update `donations.industry_code` and `donations.industry_bucket`

## Edge Cases
- Holding companies (NAICS 551) may get miscategorized — manual overrides handle key cases
- NAICS API returning empty results falls back to 'other' bucket
- API errors don't crash the batch — individual failures are logged and counted

## Changelog
- [2026-04-07] Created — initial implementation
