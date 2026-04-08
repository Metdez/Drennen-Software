import type { Entity, AnalysisVerdict } from '@/lib/types/database';

const SITE_URL = 'https://thinktanktracker.org';

/**
 * Organization JSON-LD for think tank entities.
 */
export function organizationSchema(entity: Entity, verdict?: AnalysisVerdict | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: entity.name,
    url: `${SITE_URL}/entity/${entity.slug}`,
    description: entity.description ?? entity.key_angle ?? undefined,
    ...(entity.image_url ? { logo: entity.image_url } : {}),
    ...(verdict
      ? {
          review: {
            '@type': 'Review',
            author: {
              '@type': 'Organization',
              name: 'Think Tank Influence Tracker',
              url: SITE_URL,
            },
            reviewBody: verdict.rationale ?? undefined,
          },
        }
      : {}),
  };
}

/**
 * Person JSON-LD for media amplifier entities.
 */
export function personSchema(entity: Entity) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: entity.name,
    url: `${SITE_URL}/entity/${entity.slug}`,
    description: entity.description ?? entity.key_angle ?? undefined,
    ...(entity.image_url ? { image: entity.image_url } : {}),
  };
}

/**
 * BreadcrumbList JSON-LD.
 */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * WebSite JSON-LD for the homepage.
 */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Think Tank Influence Tracker',
    url: SITE_URL,
    description:
      'Track financial relationships between corporate donors, D.C. think tanks, policy papers, and U.S. legislation.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
