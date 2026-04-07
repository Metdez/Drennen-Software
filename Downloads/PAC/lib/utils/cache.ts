export type CacheCategory =
  | '990_filings'
  | 'fec_data'
  | 'policy_papers'
  | 'legislation'
  | 'lobbying_filings'
  | 'gov_contracts'
  | 'ai_analysis'
  | 'donor_resolution';

/** Cache TTLs in milliseconds. `Infinity` means the entry never expires. */
export const CACHE_DURATIONS: Record<CacheCategory, number> = {
  '990_filings': 30 * 24 * 60 * 60 * 1000,    // 30 days
  fec_data: 7 * 24 * 60 * 60 * 1000,           // 7 days
  policy_papers: 24 * 60 * 60 * 1000,           // 1 day
  legislation: 24 * 60 * 60 * 1000,             // 1 day
  lobbying_filings: 30 * 24 * 60 * 60 * 1000,   // 30 days
  gov_contracts: 30 * 24 * 60 * 60 * 1000,      // 30 days
  ai_analysis: Infinity,                         // until re-triggered
  donor_resolution: 30 * 24 * 60 * 60 * 1000,    // 30 days — company data rarely changes
};

interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

export class ApiCache {
  private store = new Map<string, CacheEntry<unknown>>();

  private buildKey(category: CacheCategory, key: string): string {
    return `${category}::${key}`;
  }

  /**
   * Returns the cached value if it exists and hasn't expired, otherwise `null`.
   */
  get<T>(category: CacheCategory, key: string): T | null {
    const compositeKey = this.buildKey(category, key);
    const entry = this.store.get(compositeKey);

    if (!entry) return null;

    const ttl = CACHE_DURATIONS[category];
    if (ttl !== Infinity && Date.now() - entry.storedAt > ttl) {
      this.store.delete(compositeKey);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Stores a value in the cache under the given category and key.
   */
  set<T>(category: CacheCategory, key: string, value: T): void {
    const compositeKey = this.buildKey(category, key);
    this.store.set(compositeKey, { value, storedAt: Date.now() });
  }

  /**
   * Invalidates cached entries. If `key` is provided, only that entry is removed.
   * Otherwise, all entries for the category are purged.
   */
  invalidate(category: CacheCategory, key?: string): void {
    if (key !== undefined) {
      this.store.delete(this.buildKey(category, key));
      return;
    }

    const prefix = `${category}::`;
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
      }
    }
  }
}
