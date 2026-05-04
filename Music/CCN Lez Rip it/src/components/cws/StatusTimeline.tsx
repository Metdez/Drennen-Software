import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Job } from '@/types'

const STEPS = [
  { key: 'drawingsApprovedDate', label: 'Drawings' },
  { key: 'bomCompleteDate', label: 'BOM in MRP' },
  { key: 'vendorAckDate', label: 'Vendor Ack' },
] as const

export function StatusTimeline({ job }: { job: Job }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((step) => {
        const date = job[step.key]
        const done = !!date
        return (
          <li
            key={step.key}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1',
              done ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500',
            )}
          >
            {done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            <span className="font-medium">{step.label}</span>
            {done && <span className="font-mono text-slate-500">{date}</span>}
          </li>
        )
      })}
      {job.bomCompletionPercent !== undefined && job.bomCompletionPercent < 100 && (
        <li className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">BOM {job.bomCompletionPercent}%</li>
      )}
    </ol>
  )
}
