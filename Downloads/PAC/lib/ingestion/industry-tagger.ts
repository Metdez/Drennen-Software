import { createClient } from '@supabase/supabase-js';
import { searchNaicsByKeyword } from './naics-client';
import { getIndustryBucket, type IndustryBucket } from '../constants/industry-buckets';
import { logger, IngestionError } from '../utils/logger';

/**
 * Manual overrides for companies whose NAICS code doesn't capture
 * their primary investigative relevance.
 *
 * Example: A holding company classified under "Management of Companies" (551)
 * but whose primary operations are fossil fuel extraction.
 */
const MANUAL_OVERRIDES: Record<string, { naicsCode: string; bucket: IndustryBucket }> = {
  'koch industries': { naicsCode: '211110', bucket: 'fossil_fuel' },
  'exxonmobil': { naicsCode: '211120', bucket: 'fossil_fuel' },
  'chevron': { naicsCode: '211120', bucket: 'fossil_fuel' },
  'bp': { naicsCode: '211120', bucket: 'fossil_fuel' },
  'shell': { naicsCode: '211120', bucket: 'fossil_fuel' },
  'raytheon': { naicsCode: '336411', bucket: 'defense' },
  'rtx corporation': { naicsCode: '336411', bucket: 'defense' },
  'lockheed martin': { naicsCode: '336411', bucket: 'defense' },
  'northrop grumman': { naicsCode: '336411', bucket: 'defense' },
  'general dynamics': { naicsCode: '336411', bucket: 'defense' },
  'boeing': { naicsCode: '336411', bucket: 'defense' },
  'the boeing company': { naicsCode: '336411', bucket: 'defense' },
  'bae systems': { naicsCode: '336411', bucket: 'defense' },
  'jpmorgan chase': { naicsCode: '522110', bucket: 'finance' },
  'goldman sachs': { naicsCode: '523110', bucket: 'finance' },
  'carlyle group': { naicsCode: '523910', bucket: 'finance' },
  'blackrock': { naicsCode: '523920', bucket: 'finance' },
  'google': { naicsCode: '519130', bucket: 'tech' },
  'alphabet': { naicsCode: '519130', bucket: 'tech' },
  'meta platforms': { naicsCode: '519130', bucket: 'tech' },
  'microsoft': { naicsCode: '511210', bucket: 'tech' },
  'amazon': { naicsCode: '454110', bucket: 'tech' },
  'pfizer': { naicsCode: '325412', bucket: 'healthcare' },
  'johnson & johnson': { naicsCode: '325412', bucket: 'healthcare' },
  'unitedhealth': { naicsCode: '524114', bucket: 'healthcare' },
};

/**
 * Attempts to determine the NAICS code and industry bucket for a company.
 *
 * Resolution order:
 * 1. Manual override (known companies whose NAICS doesn't tell the full story)
 * 2. NAICS code already known (passed from OpenCorporates industry_codes)
 * 3. NAICS keyword search using the company name
 *
 * @param companyName - Canonical company name (from OpenCorporates or alias).
 * @param existingNaicsCode - NAICS code if already known (e.g. from OpenCorporates).
 * @returns Object with naicsCode and industryBucket.
 */
export async function tagIndustry(
  companyName: string,
  existingNaicsCode: string | null,
): Promise<{ naicsCode: string | null; industryBucket: IndustryBucket }> {
  const nameLower = companyName.toLowerCase();

  // ── 1. Manual override ───────────────────────────────────────────
  for (const [pattern, override] of Object.entries(MANUAL_OVERRIDES)) {
    if (nameLower.includes(pattern)) {
      logger.debug('Industry tag via manual override', {
        companyName,
        naicsCode: override.naicsCode,
        bucket: override.bucket,
      });
      return override;
    }
  }

  // ── 2. Use existing NAICS code if provided ───────────────────────
  if (existingNaicsCode) {
    const bucket = getIndustryBucket(existingNaicsCode);
    logger.debug('Industry tag via existing NAICS code', {
      companyName,
      naicsCode: existingNaicsCode,
      bucket,
    });
    return { naicsCode: existingNaicsCode, industryBucket: bucket };
  }

  // ── 3. Search NAICS API by company name ──────────────────────────
  try {
    const results = await searchNaicsByKeyword(companyName);

    if (results.length > 0) {
      const best = results[0];
      const bucket = getIndustryBucket(best.code);
      logger.debug('Industry tag via NAICS search', {
        companyName,
        naicsCode: best.code,
        naicsTitle: best.title,
        bucket,
      });
      return { naicsCode: best.code, industryBucket: bucket };
    }
  } catch (err) {
    logger.warn('NAICS search failed, falling back to "other"', {
      companyName,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logger.info('No industry tag found', { companyName });
  return { naicsCode: null, industryBucket: 'other' };
}

/**
 * Tags a batch of resolved donors in the donations table with
 * their NAICS code and industry bucket.
 *
 * Reads donations that have a `donor_id` but null `industry_bucket`,
 * looks up the donor entity name, tags it, and updates the donations.
 */
export async function tagUntaggedDonations(
  supabase: ReturnType<typeof createClient>,
  batchSize: number = 50,
): Promise<{ tagged: number; failed: number }> {
  // Fetch donations that are resolved (have donor_id) but untagged
  const { data: donations, error: fetchError } = await supabase
    .from('donations')
    .select('id, donor_id, donor_name, industry_code, industry_bucket')
    .not('donor_id', 'is', null)
    .is('industry_bucket', null)
    .limit(batchSize);

  if (fetchError) {
    throw new IngestionError(`Failed to fetch untagged donations: ${fetchError.message}`);
  }

  if (!donations || donations.length === 0) {
    logger.info('No untagged donations to process');
    return { tagged: 0, failed: 0 };
  }

  let tagged = 0;
  let failed = 0;

  // Group by donor_id to avoid re-tagging the same donor
  const donorGroups = new Map<string, typeof donations>();
  for (const d of donations) {
    const key = d.donor_id as string;
    const group = donorGroups.get(key) ?? [];
    group.push(d);
    donorGroups.set(key, group);
  }

  for (const [donorId, donorDonations] of donorGroups) {
    // Look up donor entity name
    const { data: entity } = await supabase
      .from('entities')
      .select('name')
      .eq('id', donorId)
      .single();

    if (!entity) {
      logger.warn('Donor entity not found for tagging', { donorId });
      failed += donorDonations.length;
      continue;
    }

    const existingNaics = donorDonations[0].industry_code ?? null;

    try {
      const { naicsCode, industryBucket } = await tagIndustry(entity.name, existingNaics);

      // Update all donations for this donor
      const ids = donorDonations.map((d) => d.id);
      const { error: updateError } = await supabase
        .from('donations')
        .update({
          industry_code: naicsCode,
          industry_bucket: industryBucket,
        })
        .in('id', ids);

      if (updateError) {
        logger.error('Failed to update donations with industry tag', {
          donorId,
          error: updateError.message,
        });
        failed += donorDonations.length;
      } else {
        tagged += donorDonations.length;
        logger.info('Tagged donations', {
          donorName: entity.name,
          count: donorDonations.length,
          bucket: industryBucket,
        });
      }
    } catch (err) {
      logger.error('Industry tagging failed', {
        donorId,
        donorName: entity.name,
        error: err instanceof Error ? err.message : String(err),
      });
      failed += donorDonations.length;
    }
  }

  return { tagged, failed };
}
