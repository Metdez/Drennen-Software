import { NextResponse } from 'next/server';
import { searchFromParams } from '@/lib/search/unified';
import { logger } from '@/lib/utils/logger';
import { rateLimit } from '@/lib/utils/api-rate-limiter';

export async function GET(request: Request) {
  // Rate limit: 30 requests per minute per IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() ?? realIp ?? 'unknown';
  const rl = rateLimit(ip, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rl.resetAt },
      { status: 429 }
    );
  }

  const start = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required query parameter: q', code: 'SEARCH_ERROR' },
        { status: 400 }
      );
    }

    if (q.length > 200) {
      return NextResponse.json(
        { error: 'Query too long (max 200 characters)', code: 'SEARCH_ERROR' },
        { status: 400 }
      );
    }

    const response = await searchFromParams(searchParams);
    const durationMs = Math.round(performance.now() - start);

    logger.info('Search completed', {
      query: q,
      resultCount: response.totalCount,
      durationMs,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);

    logger.error('Search failed', {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });

    return NextResponse.json(
      { error: 'Search failed', code: 'SEARCH_ERROR' },
      { status: 500 }
    );
  }
}
