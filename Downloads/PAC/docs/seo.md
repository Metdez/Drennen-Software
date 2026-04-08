# SEO Module

## Files

| File | Purpose |
|------|---------|
| `lib/seo/metadata.ts` | Site-wide default `Metadata` object (title template, OG defaults, Twitter card config) |
| `lib/seo/entity-metadata.ts` | `generateEntityMetadata()` — rich metadata for entity profile pages with OG image URL |
| `lib/seo/structured-data.ts` | JSON-LD schema generators: `organizationSchema`, `personSchema`, `breadcrumbSchema`, `websiteSchema` |
| `components/StructuredData.tsx` | React component that renders `<script type="application/ld+json">` |
| `app/api/og/entity/[slug]/route.tsx` | Edge route that generates dynamic OG images (1200x630) per entity |

## Integration Notes

- `siteMetadata` from `lib/seo/metadata.ts` should be spread into the root `layout.tsx` metadata export.
- `generateEntityMetadata` from `lib/seo/entity-metadata.ts` should replace or wrap the current `generateMetadata` in `app/(pages)/entity/[slug]/page.tsx`.
- `StructuredData` component should be included in pages that need JSON-LD (entity pages, homepage).
- The OG route uses `@supabase/supabase-js` directly (not the SSR client) since it runs on the edge and doesn't need cookies.

## Verdict Color Mapping

| Verdict | Color |
|---------|-------|
| `donor_captured` | `#dc2626` (red) |
| `partially_captured` | `#f59e0b` (amber) |
| `mostly_independent` | `#3b82f6` (blue) |
| `independent` | `#22c55e` (green) |
