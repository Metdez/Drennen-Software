'use client'

import { useState } from 'react'

interface CollapsiblePanelProps {
  icon: string
  title: string
  preview: string
  defaultOpen?: boolean
  children: React.ReactNode
}

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
