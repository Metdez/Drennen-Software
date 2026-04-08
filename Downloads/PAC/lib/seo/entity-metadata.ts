import type { Metadata } from 'next';
import { buildEntityProfile } from '@/lib/profiles/builder';
import type { Verdict } from '@/lib/types/database';

const verdictLabels: Record<Verdict, string> = {
  donor_captured: 'Donor Captured',
  partially_captured: 'Partially Captured',
  mostly_independent: 'Mostly Independent',
  independent: 'Independent',
};

/**
 * Generates rich metadata for an entity profile page.
 * Designed to be wired into the entity page's `generateMetadata` export.
 */
export async function generateEntityMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await buildEntityProfile(slug);

  // Fallback: if entity doesn't exist, return minimal metadata
  if (!profile) {
    const fallbackTitle = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      title: fallbackTitle,
      description: `Financial relationships and policy influence analysis for ${fallbackTitle}.`,
    };
  }

  const { entity, verdict } = profile;
  const verdictText = verdict
    ? verdictLabels[verdict.verdict]
    : 'Under Analysis';
  const typeLabel =
    entity.type === 'think_tank'
      ? 'Think Tank'
      : entity.type === 'media_amplifier'
        ? 'Media Amplifier'
        : entity.type.charAt(0).toUpperCase() + entity.type.slice(1);

  const description = [
    `${entity.name} — ${typeLabel}.`,
    verdict ? `Verdict: ${verdictText}.` : '',
    entity.key_angle || '',
    'Follow the money from donors to policy.',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    title: entity.name,
    description,
    openGraph: {
      title: `${entity.name} — ${verdictText}`,
      description,
      type: 'profile',
      images: [
        {
          url: `/api/og/entity/${slug}`,
          width: 1200,
          height: 630,
          alt: `${entity.name} influence profile`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${entity.name} — ${verdictText}`,
      description,
      images: [`/api/og/entity/${slug}`],
    },
  };
}
