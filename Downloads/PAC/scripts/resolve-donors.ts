import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { resolveDonorName } from '../lib/ingestion/donor-resolver';
import { tagIndustry } from '../lib/ingestion/industry-tagger';
import { logger } from '../lib/utils/logger';
import type { DonorResolutionCheckpoint } from '../lib/types/donor-resolution';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Environment ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Checkpoint ─────────────────────────────────────────────────────────────────

const CHECKPOINT_PATH = path.join(__dirname, 'donor-resolution-state.json');
const BATCH_SIZE = 50;

function loadCheckpoint(): DonorResolutionCheckpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      const raw = fs.readFileSync(CHECKPOINT_PATH, 'utf-8');
      return JSON.parse(raw) as DonorResolutionCheckpoint;
    }
  } catch {
    logger.warn('Could not load checkpoint, starting fresh');
  }
  return null;
}

function saveCheckpoint(checkpoint: DonorResolutionCheckpoint): void {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n--- Phase 5: Donor Resolution & Industry Tagging ---\n');

  const checkpoint = loadCheckpoint();
  const resumeOffset = checkpoint?.resumeOffset ?? 0;

  // Count total unresolved donations
  const { count, error: countError } = await supabase
    .from('donations')
    .select('id', { count: 'exact', head: true })
    .is('donor_id', null);

  if (countError) {
    console.error(`Failed to count unresolved donations: ${countError.message}`);
    process.exit(1);
  }

  const totalCount = count ?? 0;
  console.log(`Total unresolved donations: ${totalCount}`);
  console.log(`Resuming from offset: ${resumeOffset}\n`);

  if (totalCount === 0) {
    console.log('No unresolved donations to process. Done.');
    return;
  }

  let processedCount = resumeOffset;
  let resolvedCount = 0;
  let failedCount = 0;
  const unresolvedNames: string[] = checkpoint?.unresolvedNames ?? [];

  // Deduplicate: get distinct donor names that haven't been resolved yet
  const { data: distinctDonors, error: fetchError } = await supabase
    .from('donations')
    .select('donor_name')
    .is('donor_id', null)
    .range(resumeOffset, resumeOffset + BATCH_SIZE - 1);

  if (fetchError || !distinctDonors) {
    console.error(`Failed to fetch donations: ${fetchError?.message}`);
    process.exit(1);
  }

  // Get unique names from this batch
  const uniqueNames = [...new Set(distinctDonors.map((d) => d.donor_name))];

  console.log(`Processing ${uniqueNames.length} unique donor names in this batch...\n`);

  for (const donorName of uniqueNames) {
    console.log(`  Resolving: "${donorName}"...`);

    try {
      // ── Step A: Resolve the name ──
      const result = await resolveDonorName(donorName, supabase);

      if (!result.resolved) {
        console.log(`    UNRESOLVED: ${result.failureReason}`);
        unresolvedNames.push(donorName);
        failedCount++;
      } else {
        console.log(`    RESOLVED -> ${result.canonicalName} (entity: ${result.entityId})`);

        // ── Step B: Tag with industry ──
        const { naicsCode, industryBucket } = await tagIndustry(
          result.canonicalName!,
          result.naicsCode,
        );

        console.log(`    INDUSTRY: ${industryBucket} (NAICS: ${naicsCode ?? 'none'})`);

        // ── Step C: Update all matching donation rows ──
        const { error: updateError, count: updatedCount } = await supabase
          .from('donations')
          .update({
            donor_id: result.entityId,
            industry_code: naicsCode,
            industry_bucket: industryBucket,
          })
          .eq('donor_name', donorName)
          .is('donor_id', null);

        if (updateError) {
          console.error(`    UPDATE FAILED: ${updateError.message}`);
          failedCount++;
        } else {
          console.log(`    Updated ${updatedCount ?? '?'} donation rows`);
          resolvedCount++;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`    ERROR: ${message}`);
      unresolvedNames.push(donorName);
      failedCount++;
    }

    processedCount++;

    // Save checkpoint after each donor
    saveCheckpoint({
      lastRunAt: new Date().toISOString(),
      processedCount,
      totalCount,
      unresolvedNames,
      resumeOffset: processedCount,
    });
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log('\n--- Resolution Summary ---');
  console.log(`  Resolved:   ${resolvedCount}`);
  console.log(`  Failed:     ${failedCount}`);
  console.log(`  Remaining:  ${totalCount - processedCount}`);
  console.log(`  Checkpoint: ${CHECKPOINT_PATH}`);

  if (unresolvedNames.length > 0) {
    console.log(`\n  Unresolved donors (${unresolvedNames.length}):`);
    for (const name of unresolvedNames) {
      console.log(`    - ${name}`);
    }
  }

  if (processedCount < totalCount) {
    console.log(`\nRun this script again to process the next batch of ${BATCH_SIZE}.`);
  } else {
    console.log('\nAll donations processed!');

    // Clean up checkpoint
    if (fs.existsSync(CHECKPOINT_PATH)) {
      fs.unlinkSync(CHECKPOINT_PATH);
      console.log('Checkpoint file cleaned up.');
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
