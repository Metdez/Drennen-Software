export type ApiName =
  | 'fec'
  | 'propublica'
  | 'congress'
  | 'nytimes'
  | 'lda'
  | 'openrouter'
  | 'opencorporates'
  | 'naics';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  delayMs: number;
}

const API_CONFIGS: Record<ApiName, RateLimitConfig> = {
  fec: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    delayMs: 4000,
  },
  propublica: {
    maxRequests: 500,
    windowMs: 60 * 60 * 1000,
    delayMs: 8000,
  },
  congress: {
    maxRequests: 5000,
    windowMs: 60 * 60 * 1000,
    delayMs: 1000,
  },
  nytimes: {
    maxRequests: 500,
    windowMs: 24 * 60 * 60 * 1000, // 1 day
    delayMs: 12000,
  },
  lda: {
    maxRequests: 200,
    windowMs: 60 * 60 * 1000,
    delayMs: 20000,
  },
  openrouter: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    delayMs: 1000,
  },
  opencorporates: {
    maxRequests: 500,
    windowMs: 24 * 60 * 60 * 1000, // 1 day (free tier ~500/day)
    delayMs: 2000,
  },
  naics: {
    maxRequests: 10000,
    windowMs: 60 * 60 * 1000, // 1 hour (unlimited, but be polite)
    delayMs: 500,
  },
};

export class RateLimiter {
  private readonly config: RateLimitConfig;
  private readonly apiName: ApiName;
  private requestCount: number;
  private windowStart: number;

  constructor(apiName: ApiName) {
    this.apiName = apiName;
    this.config = API_CONFIGS[apiName];
    this.requestCount = 0;
    this.windowStart = Date.now();
  }

  /**
   * Waits the configured delay and increments the request counter.
   * Throws if the rate limit for the current window would be exceeded.
   */
  async throttle(): Promise<void> {
    const now = Date.now();

    // Reset counter if the window has elapsed
    if (now - this.windowStart >= this.config.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.config.maxRequests) {
      const resetAt = new Date(this.windowStart + this.config.windowMs);
      throw new Error(
        `Rate limit exceeded for ${this.apiName}: ${this.config.maxRequests} requests per window. ` +
          `Resets at ${resetAt.toISOString()}.`
      );
    }

    await new Promise<void>((resolve) =>
      setTimeout(resolve, this.config.delayMs)
    );

    this.requestCount++;
  }

  /** Current number of requests made in this window. */
  get currentCount(): number {
    return this.requestCount;
  }

  /** Maximum requests allowed per window. */
  get limit(): number {
    return this.config.maxRequests;
  }
}

export function createRateLimiter(apiName: ApiName): RateLimiter {
  return new RateLimiter(apiName);
}
