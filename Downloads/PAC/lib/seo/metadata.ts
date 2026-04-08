import type { Metadata } from 'next';

export const siteMetadata: Metadata = {
  metadataBase: new URL('https://thinktanktracker.org'),
  title: {
    default: 'Think Tank Influence Tracker — Follow the Money',
    template: '%s | Think Tank Influence Tracker',
  },
  description:
    'Track financial relationships between corporate donors, D.C. think tanks, policy papers, and U.S. legislation. AI-powered donor-alignment analysis.',
  keywords: [
    'think tank',
    'donor influence',
    'policy analysis',
    'campaign finance',
    'lobbying',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Think Tank Influence Tracker',
    images: ['/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};
