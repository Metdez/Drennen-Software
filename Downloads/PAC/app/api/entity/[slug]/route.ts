import { buildEntityProfile } from '@/lib/profiles/builder';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/utils/api-rate-limiter';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit: 60 requests per minute per IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() ?? realIp ?? 'unknown';
  const rl = rateLimit(ip, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rl.resetAt },
      { status: 429 }
    );
  }

  const { slug } = await params;

  try {
    const profile = await buildEntityProfile(slug);

    if (!profile) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error building entity profile:', error);
    return NextResponse.json(
      { error: 'Failed to load entity profile', code: 'ENTITY_PROFILE_ERROR' },
      { status: 500 }
    );
  }
}
