import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { WeekIndex } from '@/types'
import { WEEK_LABELS } from '@/lib/date-utils'

export function WeekGroupHeader({ week, count }: { week: WeekIndex; count: number }) {
  const { isOver, setNodeRef } = useDroppable({ id: `week-${week}` })
  return (
    <tr ref={setNodeRef}>
      <td
        colSpan={17}
        className={cn(
          'border-y border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700',
          isOver && 'bg-blue-50 text-blue-800',
        )}
      >
        Week {week} - {WEEK_LABELS[week]} <span className="ml-2 font-normal text-slate-500">{count} orders</span>
      </td>
    </tr>
  )
}
