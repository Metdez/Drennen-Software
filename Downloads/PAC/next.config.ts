import type { NextConfig } from 'next';

// To analyze bundle size, run: ANALYZE=true next build
// Or use the npm script: pnpm analyze

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  experimental: {
    optimizePackageImports: ['recharts', 'd3', 'react-force-graph-2d'],
  },
};

export default nextConfig;
