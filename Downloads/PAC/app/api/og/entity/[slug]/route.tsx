import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';
import type { Verdict } from '@/lib/types/database';

export const runtime = 'edge';

const verdictColors: Record<Verdict, string> = {
  donor_captured: '#dc2626',
  partially_captured: '#f59e0b',
  mostly_independent: '#3b82f6',
  independent: '#22c55e',
};

const verdictLabels: Record<Verdict, string> = {
  donor_captured: 'Donor Captured',
  partially_captured: 'Partially Captured',
  mostly_independent: 'Mostly Independent',
  independent: 'Independent',
};

const typeLabels: Record<string, string> = {
  think_tank: 'Think Tank',
  media_amplifier: 'Media Amplifier',
  donor: 'Donor',
  politician: 'Politician',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, type, key_angle')
    .eq('slug', slug)
    .single();

  if (!entity) {
    return new Response('Entity not found', { status: 404 });
  }

  const { data: verdictRow } = await supabase
    .from('analysis_verdicts')
    .select('verdict')
    .eq('entity_id', entity.id)
    .order('last_analyzed', { ascending: false })
    .limit(1)
    .single();

  const verdictValue = (verdictRow?.verdict as Verdict) ?? null;
  const badgeColor = verdictValue ? verdictColors[verdictValue] : '#6b7280';
  const badgeLabel = verdictValue ? verdictLabels[verdictValue] : 'Under Analysis';
  const typeLabel = typeLabels[entity.type] ?? entity.type;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          backgroundColor: '#0a0a0f',
          color: '#f3f4f6',
        }}
      >
        {/* Top: type label */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '20px',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {typeLabel}
          </span>
        </div>

        {/* Center: entity name + verdict */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h1
            style={{
              fontSize: '64px',
              fontFamily: 'serif',
              fontWeight: 700,
              lineHeight: 1.1,
              margin: 0,
              color: '#f9fafb',
            }}
          >
            {entity.name}
          </h1>

          {/* Verdict badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: badgeColor,
              }}
            />
            <span style={{ fontSize: '28px', fontWeight: 600, color: badgeColor }}>
              {badgeLabel}
            </span>
          </div>

          {/* Key angle */}
          {entity.key_angle && (
            <p
              style={{
                fontSize: '22px',
                color: '#9ca3af',
                margin: 0,
                lineHeight: 1.4,
                maxWidth: '900px',
              }}
            >
              {entity.key_angle}
            </p>
          )}
        </div>

        {/* Bottom: site name */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '20px', color: '#6b7280' }}>
            thinktanktracker.org
          </span>
          <span style={{ fontSize: '16px', color: '#4b5563' }}>
            Follow the Money
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, s-maxage=86400',
      },
    }
  );
}
