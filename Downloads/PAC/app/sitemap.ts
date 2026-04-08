import type { MetadataRoute } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceRoleClient();
  const { data: entities } = await supabase
    .from('entities')
    .select('slug, updated_at');

  const entityPages = (entities ?? []).map((e) => ({
    url: `https://thinktanktracker.org/entity/${e.slug}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: 'https://thinktanktracker.org',
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: 'https://thinktanktracker.org/search',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: 'https://thinktanktracker.org/visualizations',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    ...entityPages,
  ];
}
