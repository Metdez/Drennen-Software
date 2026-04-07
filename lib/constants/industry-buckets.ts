export type IndustryBucket =
  | 'fossil_fuel'
  | 'defense'
  | 'tech'
  | 'finance'
  | 'healthcare'
  | 'foreign_gov'
  | 'other';

export const INDUSTRY_BUCKETS: Record<string, string> = {
  // Fossil fuel
  '211': 'fossil_fuel',    // Oil & Gas Extraction
  '213': 'fossil_fuel',    // Mining Support Activities
  '324': 'fossil_fuel',    // Petroleum & Coal Products

  // Defense
  '332': 'defense',        // Fabricated Metal Products (weapons)
  '336': 'defense',        // Transportation Equipment (defense vehicles/aircraft)
  '928': 'defense',        // National Security & International Affairs

  // Tech
  '334': 'tech',           // Computer & Electronic Products
  '511': 'tech',           // Publishing Industries (software)
  '518': 'tech',           // Data Processing & Hosting
  '519': 'tech',           // Web Search Portals & Information Services
  '541': 'tech',           // Professional, Scientific & Technical Services

  // Finance
  '522': 'finance',        // Credit Intermediation & Related Activities
  '523': 'finance',        // Securities, Commodities, Investments
  '524': 'finance',        // Insurance Carriers & Related Activities
  '525': 'finance',        // Funds, Trusts & Other Financial Vehicles

  // Healthcare
  '325': 'healthcare',     // Chemical Manufacturing (pharma)
  '621': 'healthcare',     // Ambulatory Health Care
  '622': 'healthcare',     // Hospitals
  '623': 'healthcare',     // Nursing & Residential Care

  // Foreign government entities get tagged manually — no NAICS code maps here.
  // Use the 'foreign_gov' bucket via manual override in donor-resolver.ts.
};

/**
 * Maps a NAICS code to an industry bucket by matching on the first 3 digits.
 * Returns 'other' if no match is found.
 */
export function getIndustryBucket(naicsCode: string): IndustryBucket {
  const prefix = naicsCode.slice(0, 3);
  const bucket = INDUSTRY_BUCKETS[prefix];
  if (bucket) {
    return bucket as IndustryBucket;
  }
  return 'other';
}
