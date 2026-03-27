'use client'

import { useState } from 'react'
import type { ParticipationDelta as ParticipationDeltaType } from '@/types'

interface ParticipationDeltaProps {
  delta: ParticipationDeltaType
  speakerA: string
  speakerB: string
}

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
