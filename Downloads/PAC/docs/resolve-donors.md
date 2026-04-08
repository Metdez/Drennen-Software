# resolve-donors (CLI script)

## Purpose
CLI orchestrator that runs the full donor resolution and industry tagging pipeline over all unresolved `donations` rows. Supports checkpointing for resumable runs.

## Usage
```bash
npx tsx scripts/resolve-donors.ts
```

Run multiple times to process batches of 50. The script auto-resumes from where it left off via a checkpoint file.

## Dependencies
- External: OpenCorporates API, NAICS API (via donor-resolver and industry-tagger)
- Internal: `lib/ingestion/donor-resolver.ts`, `lib/ingestion/industry-tagger.ts`, `lib/utils/logger.ts`
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Data Flow
1. Reads unresolved `donations` rows (where `donor_id` IS NULL)
2. Deduplicates by `donor_name`
3. For each unique name: resolves via `resolveDonorName()`, tags via `tagIndustry()`
4. Updates all matching donation rows with `donor_id`, `industry_code`, `industry_bucket`
5. Saves checkpoint after each donor for crash recovery

## Checkpoint File
`scripts/donor-resolution-state.json` — auto-created, auto-cleaned when all rows are processed. Do not commit this file.

## Edge Cases
- If the script crashes mid-run, re-run it — it resumes from the checkpoint
- Unresolved donors are logged to the console and saved in the checkpoint file
- When all donations are processed, the checkpoint file is automatically deleted

## Changelog
- [2026-04-07] Created — initial implementation
