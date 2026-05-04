import { AlertTriangle, CheckCircle2, CircleDot, Clock, PauseCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Job } from '@/types'

const STATUS_META: Record<Job['status'], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: 'Ready', className: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: CheckCircle2 },
  warning: { label: 'Watch', className: 'border-amber-200 bg-amber-50 text-amber-800', icon: Clock },
  blocked: { label: 'Blocked', className: 'border-red-200 bg-red-50 text-red-800', icon: AlertTriangle },
  acknowledged: { label: 'Ack', className: 'border-slate-200 bg-slate-100 text-slate-700', icon: CircleDot },
  hold: { label: 'Hold', className: 'border-slate-300 bg-slate-100 text-slate-500', icon: PauseCircle },
}

export function StatusFlag({ status, compact = false }: { status: Job['status']; compact?: boolean }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border font-semibold',
        compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
        meta.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  )
}
