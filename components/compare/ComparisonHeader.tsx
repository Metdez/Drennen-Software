/**
 * ComparisonHeader — Side-by-side session identity header for the compare page.
 *
 * Displays the two sessions being compared with speaker names, dates, and file
 * counts separated by a styled "VS" divider. Session A is right-aligned,
 * Session B is left-aligned.
 *
 * Rendered by: app/(app)/compare/page.tsx,
 *              app/(public)/shared/compare/[token]/page.tsx
 */
'use client'

import type { SessionSummary } from '@/types'

/**
 * Props for ComparisonHeader.
 * @prop sessionA - Left session (BRAND.ORANGE accented).
 * @prop sessionB - Right session (BRAND.PURPLE accented).
 */
/**
 * What it does
 * Defines the shape of the props object expected by the ComparisonHeader component.
 * Why it is used
 * To ensure type safety and clarity for the data passed into the ComparisonHeader component, specifically two SessionSummary objects for comparison.
 * Important implementation details
 * It includes `sessionA` and `sessionB`, which are of type `SessionSummary`, representing the left and right sessions being compared.
 */
interface ComparisonHeaderProps {
  sessionA: SessionSummary
  sessionB: SessionSummary
}

/**
 * What it does
 * Formats an ISO 8601 date string into a more human-readable date string.
 * Why it is used
 * To display session creation dates in a user-friendly format within the ComparisonHeader component, rather than raw ISO strings.
 * Important implementation details
 * It uses `toLocaleDateString` with the 'en-US' locale and options to display the full year, long month name, and day, e.g., "January 1, 2023".
 */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * What it does
 * Renders a header component that visually compares two session summaries, `sessionA` and `sessionB`, displaying key details for each.
 * Why it is used
 * To provide a clear and organized visual overview of two distinct sessions being compared, highlighting their speaker names, creation dates, and file counts with a prominent "VS" separator.
 * Important implementation details
 * This is a client-side component (`'use client'`). It takes two `SessionSummary` objects as props. `sessionA` is styled with an orange accent (e.g., text, background tint), while `sessionB` uses a purple accent. A vertical divider with a "VS" text separates the two session displays. It utilizes specific CSS variables for fonts (`--font-dm-sans`, `--font-playfair`) and applies Tailwind CSS classes for layout and styling.
 */
// Renders the branded header mirrored on the share page so viewers immediately know which sessions are being compared.
export function ComparisonHeader({ sessionA, sessionB }: ComparisonHeaderProps) {
  return (
    <div className="flex items-center gap-4 font-[family-name:var(--font-dm-sans)]">
      {/* Session A */}
      <div className="flex-1 text-right">
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
          {sessionA.speakerName}
        </h2>
        <div className="flex items-center justify-end gap-2 mt-1">
          <span className="text-sm text-[var(--text-secondary)]">{formatDate(sessionA.createdAt)}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[rgba(243,111,33,0.10)] text-[#f36f21]">
            {sessionA.fileCount} files
          </span>
        </div>
      </div>

      {/* VS divider */}
      <div className="flex flex-col items-center gap-1 px-4">
        <div className="h-8 w-px bg-[#f36f21] opacity-30" />
        <span className="text-xs font-bold text-[#f36f21] tracking-wider">VS</span>
        <div className="h-8 w-px bg-[#f36f21] opacity-30" />
      </div>

      {/* Session B */}
      <div className="flex-1">
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
          {sessionB.speakerName}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-[var(--text-secondary)]">{formatDate(sessionB.createdAt)}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[rgba(84,39,133,0.10)] text-[#542785]">
            {sessionB.fileCount} files
          </span>
        </div>
      </div>
    </div>
  )
}
