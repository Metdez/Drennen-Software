import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SequenceRow } from './SequenceRow'
import { WeekGroupHeader } from './WeekGroupHeader'
import { WeekTotalsRow } from './WeekTotalsRow'
import type { Customer, Department, Job, WeekIndex } from '@/types'
import { WEEKS } from '@/lib/date-utils'

export function SequenceTable({
  jobs,
  customers,
  departments,
  onRowClick,
  onMove,
}: {
  jobs: Job[]
  customers: Customer[]
  departments: Department[]
  onRowClick: (job: Job) => void
  onMove: (jobId: string, targetWeek: WeekIndex) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const [, weekValue] = String(over.id).split('-')
    const targetWeek = Number(weekValue) as WeekIndex
    if (![1, 2, 3, 4].includes(targetWeek)) return
    onMove(String(active.id), targetWeek)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="overflow-auto rounded border border-slate-200 bg-white">
        <table className="min-w-[1720px] border-collapse text-left">
          <thead className="sticky top-0 z-30 bg-white text-xs text-slate-500 shadow-sm">
            <tr>
              <th className="sticky left-0 z-40 w-8 bg-white px-2 py-2 font-medium"></th>
              <th className="sticky left-8 z-40 w-24 bg-white px-2 py-2 font-medium">Status</th>
              <th className="sticky left-[104px] z-40 w-[72px] bg-white px-2 py-2 font-medium">MFG</th>
              <th className="sticky left-[176px] z-40 w-44 bg-white px-2 py-2 font-medium">Customer / Order</th>
              <th className="sticky left-[352px] z-40 w-28 bg-white px-2 py-2 font-medium">Ship</th>
              <th className="px-2 py-2 text-right font-medium">Sq Ft</th>
              {departments.map((department) => (
                <th key={department.id} className="min-w-24 px-2 py-2 text-right font-medium" title={department.name}>
                  {department.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKS.map((week) => {
              const weekJobs = jobs.filter((job) => job.shipWeek === week)
              return (
                <FragmentGroup
                  key={week}
                  week={week}
                  jobs={weekJobs}
                  allJobs={jobs}
                  customers={customers}
                  departments={departments}
                  onRowClick={onRowClick}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </DndContext>
  )
}

function FragmentGroup({
  week,
  jobs,
  allJobs,
  customers,
  departments,
  onRowClick,
}: {
  week: WeekIndex
  jobs: Job[]
  allJobs: Job[]
  customers: Customer[]
  departments: Department[]
  onRowClick: (job: Job) => void
}) {
  return (
    <>
      <WeekGroupHeader week={week} count={jobs.length} />
      {jobs.map((job) => (
        <SequenceRow
          key={job.id}
          job={job}
          customer={customers.find((customer) => customer.id === job.customerId)}
          departments={departments}
          onSelect={onRowClick}
        />
      ))}
      <WeekTotalsRow week={week} jobs={allJobs} departments={departments} />
    </>
  )
}
