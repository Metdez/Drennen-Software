import { RateLimiter, createRateLimiter } from '../utils/rate-limiter';
import { logger, IngestionError } from '../utils/logger';
import type {
  OpenCorporatesSearchResponse,
  OpenCorporatesSearchResult,
} from '../types/opencorporates';

const BASE_URL = 'https://api.opencorporates.com/v0.4';

const rateLimiter: RateLimiter = createRateLimiter('opencorporates');

/**
 * Searches OpenCorporates for companies matching the given name.
 * Returns the top results sorted by relevance score.
 *
 * @param companyName - Raw donor name to search for.
 * @param jurisdiction - Optional 2-letter jurisdiction code (e.g. 'us').
 * @returns Array of matched companies with scores.
 */
export async function searchCompanies(
  companyName: string,
  jurisdiction?: string,
): Promise<OpenCorporatesSearchResult[]> {
  await rateLimiter.throttle();

  const params = new URLSearchParams({ q: companyName });
  if (jurisdiction) {
    params.set('jurisdiction_code', jurisdiction);
  }

  const url = `${BASE_URL}/companies/search?${params.toString()}`;

  logger.info('OpenCorporates search', { companyName, url });

  const response = await fetch(url);

  if (!response.ok) {
    throw new IngestionError(
      `OpenCorporates search failed for "${companyName}": ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as OpenCorporatesSearchResponse;
  return data.results.companies;
}

/**
 * Fetches full details for a specific company by jurisdiction and number.
 */
export async function getCompanyDetails(
  jurisdictionCode: string,
  companyNumber: string,
): Promise<OpenCorporatesSearchResult['company'] | null> {
  await rateLimiter.throttle();

  const url = `${BASE_URL}/companies/${jurisdictionCode}/${companyNumber}`;

  logger.info('OpenCorporates detail fetch', { jurisdictionCode, companyNumber });

  const response = await fetch(url);

  if (response.status === 404) {
    logger.warn('OpenCorporates company not found', { jurisdictionCode, companyNumber });
    return null;
  }

  if (!response.ok) {
    throw new IngestionError(
      `OpenCorporates detail fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { results: { company: OpenCorporatesSearchResult['company'] } };
  return data.results.company;
}
