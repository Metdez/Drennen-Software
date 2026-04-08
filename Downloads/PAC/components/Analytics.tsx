'use client';

import Script from 'next/script';

/**
 * Privacy-first analytics loader.
 * Supports Plausible Analytics (no cookies, GDPR-compliant).
 * Renders nothing if NEXT_PUBLIC_ANALYTICS_DOMAIN is not set.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;

  if (!domain) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
