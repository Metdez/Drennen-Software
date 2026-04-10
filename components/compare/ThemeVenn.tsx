/**
 * ThemeVenn — Three-column Venn-style layout of shared and unique themes.
 *
 * Renders theme overlap as three columns:
 *  - Left (BRAND.ORANGE): themes unique to session A
 *  - Center (BRAND.PURPLE): themes shared between both sessions; when the
 *    matched theme titles differ, both variants are shown with a ↔ connector
 *  - Right (BRAND.GREEN): themes unique to session B
 *
 * Rendered by: app/(app)/compare/page.tsx (themes tab),
 *              app/(public)/shared/compare/[token]/page.tsx
 */
'use client'

import type { ThemeOverlapResult } from '@/types'

/**
 * Props for ThemeVenn.
 * @prop themeOverlap - Pre-computed theme overlap from /api/compare.
 * @prop speakerA     - Speaker name for session A (column heading).
 * @prop speakerB     - Speaker name for session B (column heading).
 */
/**
 * Defines the properties required by the ThemeVenn component.
 *
 * It is used to ensure type safety and structure for the data passed to the ThemeVenn component, guaranteeing that it receives the necessary pre-computed theme overlap results and speaker names.
 *
 * The interface includes 'themeOverlap' which carries the core comparison data, and 'speakerA' and 'speakerB' for labeling the respective columns in the UI.
 */
interface ThemeVennProps {
  themeOverlap: ThemeOverlapResult
  speakerA: string
  speakerB: string
}

/**
 * Renders a visual representation of theme overlap between two speakers or sessions, structured like a three-column Venn diagram. It displays themes unique to speaker A, themes shared between both, and themes unique to speaker B.
 *
 * This component is used to provide users with a clear and easily digestible comparison of themes from two distinct sources, highlighting commonalities and differences. It serves as a key visual element in the application's comparison feature.
 *
 * It is a client-side component, indicated by 'use client'. It utilizes a CSS grid for layout and iterates over the 'themeOverlap' data to dynamically render theme lists. It includes conditional rendering for empty theme lists and applies distinct styling (background/text colors) to differentiate themes from each category. Shared themes that might have differing phrasings (themeA !== themeB) are indicated with an '↔' symbol.
 */
// Visualizes shared and unique themes for both the compare portal and the public share experience.
export function ThemeVenn({ themeOverlap, speakerA, speakerB }: ThemeVennProps) {
  return (
    <div className="grid grid-cols-3 gap-6 font-[family-name:var(--font-dm-sans)]">
      {/* Unique to A */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Only in {speakerA}
        </h3>
        <div className="space-y-2">
          {themeOverlap.uniqueToA.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic">None — all themes shared</p>
          ) : (
            themeOverlap.uniqueToA.map((theme, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(243,111,33,0.08)', color: '#f36f21' }}
              >
                {theme}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Shared */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3 text-center">
          Shared Themes ({themeOverlap.shared.length})
        </h3>
        <div className="space-y-2">
          {themeOverlap.shared.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic text-center">No shared themes</p>
          ) : (
            themeOverlap.shared.map((pair, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-lg text-sm text-center"
                style={{ background: 'rgba(84,39,133,0.08)', color: '#542785' }}
              >
                <div className="font-medium">{pair.themeA}</div>
                {pair.themeA !== pair.themeB && (
                  <div className="text-xs opacity-70 mt-0.5">↔ {pair.themeB}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Unique to B */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3 text-right">
          Only in {speakerB}
        </h3>
        <div className="space-y-2">
          {themeOverlap.uniqueToB.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic text-right">None — all themes shared</p>
          ) : (
            themeOverlap.uniqueToB.map((theme, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-lg text-sm font-medium text-right"
                style={{ background: 'rgba(15,107,55,0.08)', color: '#0f6b37' }}
              >
                {theme}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
