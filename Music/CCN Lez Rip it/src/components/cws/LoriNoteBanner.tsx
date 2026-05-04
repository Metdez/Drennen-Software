import { CalendarClock } from 'lucide-react'
import type { Job } from '@/types'

export function LoriNoteBanner({ job }: { job: Job }) {
  if (!job.hardCustomerDate && !job.loriNote) return null
  return (
    <div className="rounded border border-red-200 bg-red-50 p-3">
      {job.hardCustomerDate && (
        <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
          <CalendarClock className="h-4 w-4" />
          Hard customer date: {job.hardCustomerDate}
        </div>
      )}
      {job.hardDateNote && <p className="mt-1 text-xs text-red-800">{job.hardDateNote}</p>}
      {job.loriNote && <p className="mt-2 text-xs text-red-900">{job.loriNote}</p>}
    </div>
  )
}
