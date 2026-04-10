"use client"

/**
 * @file SpeakerInput.tsx
 * Controlled text input for capturing the guest speaker's name on the upload form.
 *
 * Rendered by: app/(app)/dashboard/page.tsx
 *
 * This is a pure controlled component — all state lives in the parent.
 * The value is passed to /api/process as `speakerName` and stored on the session row.
 */

/**
 * Labelled text field for the speaker name entry.
 *
 * @param value - Current speaker name string (controlled from parent).
 * @param onChangeAction - Called with the new value on every keystroke.
 */
export function SpeakerInput({ value, onChangeAction }: { value: string, onChangeAction: (val: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
        Speaker Name
      </label>
      <input
        id="speakerName"
        type="text"
        value={value}
        onChange={(e) => onChangeAction(e.target.value)}
        placeholder="e.g. Jane Smith"
        className={`
          w-full px-4 py-3 rounded-lg text-sm
          bg-[var(--surface-elevated)] border border-[var(--border-accent)]
          text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
          focus:outline-none focus:border-[#f36f21] focus:ring-1 focus:ring-[rgba(243,111,33,0.35)]
          transition-all duration-200 font-[family-name:var(--font-dm-sans)]
        `}
      />
    </div>
  )
}
