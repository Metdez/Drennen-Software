import type { Department, Job, WeekIndex } from '@/types'

export function WeekTotalsRow({
  week,
  jobs,
  departments,
}: {
  week: WeekIndex
  jobs: Job[]
  departments: Department[]
}) {
  return (
    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
      <td className="sticky left-0 z-20 bg-slate-50 px-2 py-2" colSpan={5}>Week {week} totals</td>
      {departments.map((department) => {
        const total = jobs
          .filter((job) => job.shipWeek === week)
          .flatMap((job) => job.departmentHours)
          .filter((hours) => hours.departmentId === department.id)
          .reduce((sum, hours) => sum + hours.hours, 0)
        return (
          <td key={department.id} className="px-2 py-2 text-right font-mono">
            {total ? `${total}/${department.weeklyCapacityHours}` : ''}
          </td>
        )
      })}
    </tr>
  )
}
