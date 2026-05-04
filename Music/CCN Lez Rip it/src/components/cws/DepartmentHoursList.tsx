import type { Department, DepartmentHours, Worker } from '@/types'

export function DepartmentHoursList({
  hours,
  departments,
  workers,
}: {
  hours: DepartmentHours[]
  departments: Department[]
  workers: Worker[]
}) {
  const totalHours = hours.reduce((sum, item) => sum + item.hours, 0)
  return (
    <div>
      <ul className="divide-y divide-slate-100 text-xs">
        {hours.map((item) => {
          const dept = departments.find((department) => department.id === item.departmentId)
          const names = item.workerIds
            .map((id) => workers.find((worker) => worker.id === id)?.name)
            .filter(Boolean)
            .join(', ')
          return (
            <li key={item.departmentId} className="flex items-center justify-between gap-3 py-2">
              <div>
                <div className="font-medium text-slate-800">{dept?.name ?? item.departmentId}</div>
                <div className="text-[11px] text-slate-500">{names || 'Unassigned'}</div>
              </div>
              <div className="font-mono font-semibold text-slate-900">{item.hours}h</div>
            </li>
          )
        })}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-xs font-semibold">
        <span>Total</span>
        <span className="font-mono">{totalHours}h</span>
      </div>
    </div>
  )
}
