/**
 * Track custom events via Plausible's API.
 * All functions are no-ops if analytics is not loaded.
 */

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void;
  }
}

function track(event: string, props?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(event, props ? { props } : undefined);
  }
}

export function trackEntityView(entityName: string, entityType: string) {
  track('Entity View', { entity: entityName, type: entityType });
}

export function trackSearch(query: string, resultCount: number) {
  track('Search', { query, results: resultCount });
}

export function trackVerdictExpansion(entityName: string) {
  track('Verdict Expansion', { entity: entityName });
}

export function trackSourceClick(entityName: string, sourceType: string) {
  track('Source Click', { entity: entityName, source: sourceType });
}
