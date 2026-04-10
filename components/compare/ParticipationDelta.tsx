/**
 * ParticipationDelta — Student overlap breakdown between two sessions.
 *
 * Shows three groups: students who submitted to both sessions, students who
 * only submitted for session A, and students who only submitted for session B.
 * Each group uses NameList which auto-truncates at 10 names with a "Show all"
 * expand button.
 *
 * Rendered by: app/(app)/compare/page.tsx (participation tab),
 *              app/(public)/shared/compare/[token]/page.tsx
 */
'use client'

import { useState } from 'react'
import type { ParticipationDelta as ParticipationDeltaType } from '@/types'

/**
 * Props for ParticipationDelta.
 * @prop delta    - Pre-computed participation overlap data from /api/compare.
 * @prop speakerA - Speaker name for session A (used as section heading).
 * @prop speakerB - Speaker name for session B.
 */
/**
 * Props for the ParticipationDelta component.
 * 1. What it does: Defines the expected properties for the `ParticipationDelta` React component.
 * 2. Why it is used: To enforce type safety and provide clear documentation for the data that the `ParticipationDelta` component requires to function correctly.
 * 3. Important implementation details:
 *    - `delta`: Pre-computed participation overlap data, typically fetched from an API like `/api/compare`. This object contains arrays for students in both sessions, only in A, and only in B, along with the total unique count.
 *    - `speakerA`: The name of the first speaker or session, used for display purposes as a section heading.
 *    - `speakerB`: The name of the second speaker or session, also used for display purposes.
 */
interface ParticipationDeltaProps {
  delta: ParticipationDeltaType
  speakerA: string
  speakerB: string
}

/**
 * A React functional component that renders a list of names.
 * 1. What it does: Displays a collection of names, providing a mechanism to collapse or expand the list if it contains more than a predefined number of items (defaulting to 10).
 * 2. Why it is used: To present potentially long lists of student names in a user-friendly and space-efficient manner. It prevents overwhelming the UI with too many items by initially showing a truncated list and offering an option to reveal all entries.
 * 3. Important implementation details:
 *    - Uses the `useState` hook to manage its `expanded` state, controlling whether the full list or a truncated version is displayed.
 *    - The list is initially expanded if `defaultExpanded` is true or if the total number of `names` is 10 or less.
 *    - If the list is empty (`names.length === 0`), it renders a 'None' placeholder.
 *    - When collapsed, it shows the first 10 names and a 'Show all X students' button to toggle expansion.
 *    - Each name is rendered as a `span` with specific Tailwind CSS classes for styling (e.g., background, text color, font size).
 *    - The button for expanding uses a distinct style and triggers the `setExpanded` state change.
 */
function NameList({ names, defaultExpanded = false }: { names: string[]; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded || names.length <= 10)

  if (names.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] italic">None</p>
  }

  const shown = expanded ? names : names.slice(0, 10)

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {shown.map(name => (
          <span
            key={name}
            className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-elevated)] text-[var(--text-secondary)]"
          >
            {name}
          </span>
        ))}
      </div>
      {!expanded && names.length > 10 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs text-[#f36f21] hover:underline font-[family-name:var(--font-dm-sans)]"
        >
          Show all {names.length} students
        </button>
      )}
    </div>
  )
}

/**
 * A React functional component that displays the comparative student participation between two sessions.
 * 1. What it does: Presents a summary and detailed breakdown of student participation, categorizing students who attended both sessions, only session A, and only session B.
 * 2. Why it is used: To provide a clear visual representation and analysis of student overlap and unique engagement across two distinct learning or activity sessions, facilitating insights into audience dynamics or student engagement patterns.
 * 3. Important implementation details:
 *    - It's a client-side component, indicated by `'use client'`.
 *    - It accepts `delta` (pre-computed comparison data), `speakerA` (name for session A), and `speakerB` (name for session B) as props.
 *    - The component first displays a summary block showing the total unique students and how many participated in both sessions.
 *    - It then divides the display into three distinct sections: 'In Both Sessions', 'Only in {speakerA}', and 'Only in {speakerB}'.
 *    - Each section uses the `NameList` helper component to render the respective list of student names, ensuring consistent and expandable list presentation.
 *    - Each section is styled with specific background colors, text colors, and font styles to visually differentiate the categories (e.g., purple for 'In Both', orange for 'Only A', green for 'Only B').
 *    - The overall layout uses `space-y-6` for vertical spacing and applies a custom font family (`--font-dm-sans`).
 */
// Displays the student overlap data that also lives on the public comparison share page.
export function ParticipationDelta({ delta, speakerA, speakerB }: ParticipationDeltaProps) {
  return (
    <div className="space-y-6 font-[family-name:var(--font-dm-sans)]">
      {/* Summary */}
      <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--surface-elevated)' }}>
        <p className="text-sm text-[var(--text-primary)]">
          <span className="font-semibold">{delta.bothSessions.length}</span> of{' '}
          <span className="font-semibold">{delta.totalUnique}</span> students submitted for both sessions.
        </p>
      </div>

      {/* In both */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
            In Both Sessions
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[rgba(84,39,133,0.10)] text-[#542785]">
            {delta.bothSessions.length}
          </span>
        </div>
        <NameList names={delta.bothSessions} />
      </div>

      {/* Only A */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
            Only in {speakerA}
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[rgba(243,111,33,0.10)] text-[#f36f21]">
            {delta.onlyA.length}
          </span>
        </div>
        <NameList names={delta.onlyA} />
      </div>

      {/* Only B */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
            Only in {speakerB}
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[rgba(15,107,55,0.10)] text-[#0f6b37]">
            {delta.onlyB.length}
          </span>
        </div>
        <NameList names={delta.onlyB} />
      </div>
    </div>
  )
}
