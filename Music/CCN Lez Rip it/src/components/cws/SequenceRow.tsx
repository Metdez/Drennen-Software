import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { StatusFlag } from './StatusFlag'
import { cn } from '@/lib/utils'
import { getDerivedStatus } from '@/lib/status-rules'
import type { Customer, Department, Job } from '@/types'

const ROW_TINT: Record<Job['status'], string> = {
  healthy: 'bg-emerald-50/35 hover:bg-emerald-50',
  warning: 'bg-amber-50/60 hover:bg-amber-50',
  blocked: 'bg-red-50/70 hover:bg-red-50',
  acknowledged: 'bg-slate-50 hover:bg-slate-100',
  hold: 'bg-slate-100 text-slate-500',
}

export function SequenceRow({
  job,
  customer,
  departments,
  onSelect,
}: {
  job: Job
  customer?: Customer
  departments: Department[]
  onSelect: (job: Job) => void
}) {
  const status = getDerivedStatus(job)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id })
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn('border-b border-slate-100 text-xs transition', ROW_TINT[status], isDragging && 'relative z-30 opacity-70')}
    >
      <td className={cn('sticky left-0 z-20 px-2 py-2', ROW_TINT[status])}>
        <button
          className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
          aria-label={`Move MFG ${job.mfgNumber}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className={cn('sticky left-8 z-20 px-2 py-2', ROW_TINT[status])}>
        <StatusFlag status={status} compact />
      </td>
      <td className={cn('sticky left-[104px] z-20 px-2 py-2 font-mono font-semibold', ROW_TINT[status])}>
        <button onClick={() => onSelect(job)} className="rounded px-1 py-0.5 hover:bg-white">#{job.mfgNumber}</button>
      </td>
      <td className={cn('sticky left-[176px] z-20 min-w-44 px-2 py-2 font-medium', ROW_TINT[status])}>
        <button onClick={() => onSelect(job)} className="text-left hover:underline">{customer?.name ?? job.customerId}</button>
        <div className="mt-0.5 max-w-56 truncate text-[11px] font-normal text-slate-500">{job.contractTitle}</div>
      </td>
      <td className={cn('sticky left-[352px] z-20 px-2 py-2 font-mono', ROW_TINT[status])}>{job.shipDate}</td>
      <td className="px-2 py-2 text-right font-mono">{job.squareFootage || '-'}</td>
      {departments.map((department) => {
        const hours = job.departmentHours.find((item) => item.departmentId === department.id)?.hours
        return (
          <td key={department.id} onClick={() => onSelect(job)} className="min-w-24 cursor-pointer px-2 py-2 text-right font-mono">
            {hours ? `${hours}h` : ''}
          </td>
        )
      })}
    </tr>
  )
}
