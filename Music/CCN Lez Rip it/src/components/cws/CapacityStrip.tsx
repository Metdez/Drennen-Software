import { getCapacityContributors } from '@/lib/capacity-calc'
import { cn } from '@/lib/utils'
import type { Customer, Department, DeptWeekCapacity, Job } from '@/types'
import { WEEKS, WEEK_LABELS } from '@/lib/date-utils'

export function CapacityStrip({
  grid,
  jobs,
  departments,
  customers,
}: {
  grid: DeptWeekCapacity[]
  jobs: Job[]
  departments: Department[]
  customers: Customer[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-xs">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="sticky left-0 z-10 w-48 bg-white pb-2 font-medium">Department</th>
            {WEEKS.map((week) => (
              <th key={week} className="pb-2 font-medium">{WEEK_LABELS[week]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.id} className="border-t border-slate-100">
              <th className="sticky left-0 z-10 bg-white py-1.5 pr-3 text-left font-medium text-slate-700">
                {department.code} - {department.name}
              </th>
              {WEEKS.map((week) => {
                const cell = grid.find((item) => item.departmentId === department.id && item.week === week)
                const contributors = getCapacityContributors(jobs, department.id, week)
                const title = contributors.length
                  ? contributors
                      .map((contributor) => {
                        const customer = customers.find((item) => item.id === contributor.customerId)?.name ?? contributor.customerId
                        return `#${contributor.mfgNumber} ${customer}: ${contributor.hours}h`
                      })
                      .join('\n')
                  : 'No scheduled work'
                return (
                  <td key={week} className="py-1.5 pr-2">
                    <div
                      title={title}
                      className={cn(
                        'rounded border px-2 py-1 font-mono',
                        cell?.status === 'red' && 'border-red-200 bg-red-50 text-red-800',
                        cell?.status === 'amber' && 'border-amber-200 bg-amber-50 text-amber-800',
                        cell?.status === 'green' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                      )}
                    >
                      {cell?.scheduledHours ?? 0} / {department.weeklyCapacityHours} ({cell?.utilizationPercent ?? 0}%)
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
