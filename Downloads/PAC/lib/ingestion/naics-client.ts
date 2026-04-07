import { RateLimiter, createRateLimiter } from '../utils/rate-limiter';
import { logger, IngestionError } from '../utils/logger';
import type { NaicsCode } from '../types/naics';

const BASE_URL = 'https://api.naics.us/v0';

const rateLimiter: RateLimiter = createRateLimiter('naics');

/**
 * Searches the NAICS API by keyword and returns matching industry codes.
 *
 * @param keyword - Industry keyword to search (e.g. "oil gas", "pharmaceuticals").
 * @param year - NAICS revision year (default 2022).
 * @returns Array of matching NAICS codes.
 */
export async function searchNaicsByKeyword(
  keyword: string,
  year: number = 2022,
): Promise<NaicsCode[]> {
  await rateLimiter.throttle();

  const url = `${BASE_URL}/q?q=${encodeURIComponent(keyword)}&year=${year}`;

  logger.info('NAICS keyword search', { keyword, year });

  const response = await fetch(url);

  if (!response.ok) {
    throw new IngestionError(
      `NAICS search failed for "${keyword}": ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as NaicsCode[];

  // The NAICS API returns a bare array, not a wrapper object
  return data;
}

/**
 * Looks up a specific NAICS code and returns its details.
 *
 * @param code - NAICS code (e.g. "211110").
 * @param year - NAICS revision year (default 2022).
 * @returns The NAICS code details, or null if not found.
 */
export async function getNaicsCode(
  code: string,
  year: number = 2022,
): Promise<NaicsCode | null> {
  await rateLimiter.throttle();

  const url = `${BASE_URL}/q?code=${encodeURIComponent(code)}&year=${year}`;

  logger.info('NAICS code lookup', { code, year });

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      logger.warn('NAICS code not found', { code });
      return null;
    }
    throw new IngestionError(
      `NAICS lookup failed for code "${code}": ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as NaicsCode[];

  // Returns array — take the first exact match
  return data.length > 0 ? data[0] : null;
}
