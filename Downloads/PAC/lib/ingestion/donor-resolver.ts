import type { SupabaseClient } from '@supabase/supabase-js';
import { searchCompanies } from './opencorporates-client';
import { logger, IngestionError } from '../utils/logger';
import type { DonorResolutionResult } from '../types/donor-resolution';
import type { OpenCorporatesSearchResult } from '../types/opencorporates';

/**
 * Known name aliases that map to canonical company names.
 * Add entries here when OpenCorporates can't resolve common abbreviations.
 */
const NAME_ALIASES: Record<string, string> = {
  'koch fdn': 'Koch Industries',
  'koch foundation': 'Koch Industries',
  'charles koch foundation': 'Koch Industries',
  'charles g koch': 'Koch Industries',
  'david h koch': 'Koch Industries',
  'raytheon technologies': 'RTX Corporation',
  'united technologies': 'RTX Corporation',
  'lockheed martin corp': 'Lockheed Martin',
  'boeing co': 'The Boeing Company',
  'google llc': 'Alphabet Inc',
  'facebook inc': 'Meta Platforms Inc',
  'meta platforms': 'Meta Platforms Inc',
};

/** Known foreign government donors — tagged as 'foreign_gov' bucket, skip OpenCorporates. */
const FOREIGN_GOV_DONORS: Record<string, string> = {
  'embassy of qatar': 'Qatar',
  'qatar foundation': 'Qatar',
  'state of qatar': 'Qatar',
  'united arab emirates': 'UAE',
  'embassy of uae': 'UAE',
  'kingdom of saudi arabia': 'Saudi Arabia',
  'republic of korea': 'South Korea',
  'government of japan': 'Japan',
  'government of norway': 'Norway',
  'government of united kingdom': 'United Kingdom',
};

/**
 * Normalizes a raw donor name for comparison:
 * lowercase, strip punctuation, collapse whitespace.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a donor name matches a known foreign government entity.
 * Returns the country name if matched, null otherwise.
 */
export function matchForeignGov(rawName: string): string | null {
  const normalized = normalizeName(rawName);
  for (const [pattern, country] of Object.entries(FOREIGN_GOV_DONORS)) {
    if (normalized.includes(pattern)) {
      return country;
    }
  }
  return null;
}

/**
 * Picks the best OpenCorporates match from search results.
 * Prefers US-jurisdiction companies and high relevance scores.
 * Returns null if no result has a score above the minimum threshold.
 */
export function pickBestMatch(
  results: OpenCorporatesSearchResult[],
  rawName: string,
): OpenCorporatesSearchResult | null {
  if (results.length === 0) return null;

  // Prefer US results
  const usResults = results.filter(
    (r) => r.company.jurisdiction_code.startsWith('us'),
  );

  const candidates = usResults.length > 0 ? usResults : results;

  // Sort by score descending
  const sorted = [...candidates].sort((a, b) => b.score - a.score);

  const best = sorted[0];

  // Require a minimum score to avoid garbage matches.
  // OpenCorporates scores vary, but below 50 is usually noise.
  if (best.score < 50) {
    logger.warn('OpenCorporates best match below threshold', {
      rawName,
      bestScore: best.score,
      bestName: best.company.name,
    });
    return null;
  }

  return best;
}

/**
 * Resolves a single raw donor name to a canonical entity.
 *
 * Resolution order:
 * 1. Check known foreign government donors (no API call needed)
 * 2. Check known name aliases (normalize then search OpenCorporates for canonical)
 * 3. Search OpenCorporates directly with the raw name
 *
 * If a match is found, upserts an entity of type 'donor' into Supabase
 * and returns the resolution result with the entity ID.
 */
export async function resolveDonorName(
  rawName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<DonorResolutionResult> {
  const normalized = normalizeName(rawName);

  // ── 1. Foreign government check ──────────────────────────────────
  const foreignCountry = matchForeignGov(rawName);
  if (foreignCountry) {
    const slug = `gov-${foreignCountry.toLowerCase().replace(/\s+/g, '-')}`;
    const { data: existing } = await supabase
      .from('entities')
      .select('id')
      .eq('slug', slug)
      .single();

    let entityId: string;
    if (existing) {
      entityId = existing.id;
    } else {
      const { data: inserted, error } = await supabase
        .from('entities')
        .upsert(
          {
            name: `Government of ${foreignCountry}`,
            slug,
            type: 'donor',
            description: `Foreign government donor: ${foreignCountry}`,
            lean: null,
            key_angle: 'Foreign government funding',
            metadata: { country: foreignCountry, donor_type: 'foreign_gov' },
          },
          { onConflict: 'slug' },
        )
        .select('id')
        .single();

      if (error || !inserted) {
        throw new IngestionError(`Failed to upsert foreign gov entity for ${foreignCountry}: ${error?.message}`);
      }
      entityId = inserted.id;
    }

    return {
      rawName,
      resolved: true,
      entityId,
      canonicalName: `Government of ${foreignCountry}`,
      opencorporatesId: null,
      naicsCode: null,
      industryBucket: 'foreign_gov',
      failureReason: null,
    };
  }

  // ── 2. Alias lookup ──────────────────────────────────────────────
  const aliasTarget = NAME_ALIASES[normalized];
  const searchName = aliasTarget ?? rawName;

  // ── 3. OpenCorporates search ─────────────────────────────────────
  let results: OpenCorporatesSearchResult[];
  try {
    results = await searchCompanies(searchName, 'us');
  } catch (err) {
    logger.error('OpenCorporates search failed', { rawName, searchName, error: err });
    return {
      rawName,
      resolved: false,
      entityId: null,
      canonicalName: null,
      opencorporatesId: null,
      naicsCode: null,
      industryBucket: 'other',
      failureReason: `OpenCorporates API error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const best = pickBestMatch(results, rawName);
  if (!best) {
    return {
      rawName,
      resolved: false,
      entityId: null,
      canonicalName: null,
      opencorporatesId: null,
      naicsCode: null,
      industryBucket: 'other',
      failureReason: 'No match above confidence threshold in OpenCorporates',
    };
  }

  const company = best.company;
  const ocId = `${company.jurisdiction_code}/${company.company_number}`;
  const slug = `donor-${company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;

  // Extract NAICS code from OpenCorporates industry_codes if available
  const naicsEntry = company.industry_codes.find(
    (ic) => ic.code_scheme_id === 'naics' || ic.code_scheme_id === 'us_naics_2022',
  );
  const naicsCode = naicsEntry?.code ?? null;

  // Upsert the donor entity
  const { data: entity, error: upsertError } = await supabase
    .from('entities')
    .upsert(
      {
        name: company.name,
        slug,
        type: 'donor' as const,
        description: `${company.company_type ?? 'Company'} — ${company.jurisdiction_code.toUpperCase()}`,
        lean: null,
        key_angle: null,
        metadata: {
          opencorporates_id: ocId,
          jurisdiction: company.jurisdiction_code,
          company_number: company.company_number,
          incorporation_date: company.incorporation_date,
          registry_url: company.registry_url,
        },
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();

  if (upsertError || !entity) {
    throw new IngestionError(`Failed to upsert donor entity for ${company.name}: ${upsertError?.message}`);
  }

  return {
    rawName,
    resolved: true,
    entityId: entity.id,
    canonicalName: company.name,
    opencorporatesId: ocId,
    naicsCode,
    industryBucket: 'other', // Will be filled by industry-tagger in the next step
    failureReason: null,
  };
}
