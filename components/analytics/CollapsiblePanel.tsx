/**
 * CollapsiblePanel — Generic accordion-style panel for the analytics and preview pages.
 *
 * Provides a togglable header (icon + title) that reveals child content when open.
 * When collapsed, the `preview` prop is shown as a one-line summary in the header.
 * Border radius is adjusted so the header and body join seamlessly when open.
 *
 * Rendered by: app/(app)/preview/page.tsx, app/(app)/analytics/page.tsx
 */
'use client'

import { useState } from 'react'

/**
 * Props for CollapsiblePanel.
 * @prop icon        - Emoji or icon string displayed before the title.
 * @prop title       - Section heading text.
 * @prop preview     - Short summary shown in the collapsed header.
 * @prop defaultOpen - Whether the panel starts open (default: false).
 * @prop children    - Content revealed when the panel is expanded.
 */
/**
 * Defines the shape of the properties required by the CollapsiblePanel component.
 * It ensures type safety and clarity for the data that can be passed to configure the panel's appearance and behavior.
 * Important implementation details:
 * - `icon`: A string (e.g., emoji) for a visual identifier in the header.
 * - `title`: The main heading text for the panel header.
 * - `preview`: A short summary text displayed when the panel is collapsed.
 * - `defaultOpen`: An optional boolean to set the initial open state of the panel. If not provided, it defaults to `false`.
 * - `children`: The content to be rendered inside the panel when it is expanded.
 */
interface CollapsiblePanelProps {
  icon: string
  title: string
  preview: string
  defaultOpen?: boolean
  children: React.ReactNode
}

/**
 * Renders a collapsible UI panel that can expand and collapse to show or hide its child content.
 * This component is used to present information efficiently, allowing users to reveal details on demand without cluttering the interface. It's ideal for settings sections, FAQ items, or any area where additional information needs to be conditionally displayed.
 * Important implementation details:
 * - It is a client-side component (`'use client'`) because it relies on React hooks (`useState`) for interactive state management.
 * - Manages its open/collapsed state internally using the `useState` hook, initialized by the `defaultOpen` prop.
 * - The panel header is implemented as a `<button>` for accessibility, allowing users to toggle its state via click.
 * - Styling dynamically adjusts based on the `open` state, e.g., border-radius of the header button is removed when open to visually connect with the expanded content.
 * - A directional arrow (`▾` or `▸`) provides a visual cue for the current expansion state.
 * - The `preview` text is only displayed when the panel is in its collapsed state.
 * - The `children` prop is rendered conditionally only when the panel is open.
 * - Uses CSS variables for styling (e.g., `var(--surface)`, `var(--border)`) to ensure consistency with a theming system.
 */
export function CollapsiblePanel({ icon, title, preview, defaultOpen = false, children }: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-[18px] py-[14px] bg-[var(--surface)] border border-[var(--border)] rounded-xl cursor-pointer transition-colors hover:bg-[var(--surface-hover)] text-left"
        style={open ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 } : undefined}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm w-5 text-center">{icon}</span>
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</span>
        </div>
        {!open && (
          <span className="text-xs text-[var(--text-muted)]">{preview}</span>
        )}
        <span className="text-xs text-[var(--text-muted)] ml-2">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="bg-[var(--surface)] border border-t-0 border-[var(--border)] rounded-b-xl px-[18px] py-4">
          {children}
        </div>
      )}
    </div>
  )
}
