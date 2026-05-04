import { useMemo, useState } from 'react'
import { Factory, FileSpreadsheet, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CapacityStrip } from '@/components/cws/CapacityStrip'
import { SequenceTable } from '@/components/cws/SequenceTable'
import { JobDrawer } from '@/components/cws/JobDrawer'
import { DragWarningModal } from '@/components/cws/DragWarningModal'
import { computeCapacityGrid } from '@/lib/capacity-calc'
import { validateMove } from '@/lib/drag-validation'
import { sortJobsForView, type ShopFlowView } from '@/lib/view-rules'
import { DEPARTMENTS } from '@/data/mock-departments'
import { WORKERS } from '@/data/mock-workers'
import { CUSTOMERS } from '@/data/mock-customers'
import { JOBS } from '@/data/mock-jobs'
import { WEEK_SHIP_DATES } from '@/lib/date-utils'
import type { DragValidationFailure, Job, WeekIndex } from '@/types'

export default function App() {
  const [jobs, setJobs] = useState<Job[]>(JOBS)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ShopFlowView>('anne')
  const [weekOf, setWeekOf] = useState('2026-05-04')
  const [pendingMove, setPendingMove] = useState<{
    jobId: string
    targetWeek: WeekIndex
    failures: DragValidationFailure[]
  } | null>(null)

  const capacityGrid = useMemo(() => computeCapacityGrid(jobs, DEPARTMENTS), [jobs])

  const visibleJobs = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = term
      ? jobs.filter((job) => {
          const customer = CUSTOMERS.find((item) => item.id === job.customerId)?.name.toLowerCase() ?? ''
          return job.mfgNumber.includes(term) || job.contractTitle.toLowerCase().includes(term) || customer.includes(term)
        })
      : jobs
    return sortJobsForView(filtered, view)
  }, [jobs, query, view])

  const applyMove = (jobId: string, targetWeek: WeekIndex, overrideReason?: string) => {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? {
              ...job,
              shipWeek: targetWeek,
              shipDate: WEEK_SHIP_DATES[targetWeek],
              auditLog: [
                {
                  date: '2026-05-04',
                  user: 'Anne',
                  action: `Moved to Week ${targetWeek}`,
                  reason: overrideReason,
                },
                ...job.auditLog,
              ],
            }
          : job,
      ),
    )
    setSelectedJob((current) =>
      current?.id === jobId
        ? {
            ...current,
            shipWeek: targetWeek,
            shipDate: WEEK_SHIP_DATES[targetWeek],
            auditLog: [
              {
                date: '2026-05-04',
                user: 'Anne',
                action: `Moved to Week ${targetWeek}`,
                reason: overrideReason,
              },
              ...current.auditLog,
            ],
          }
        : current,
    )
  }

  const handleMove = (jobId: string, targetWeek: WeekIndex) => {
    const movingJob = jobs.find((job) => job.id === jobId)
    if (!movingJob || movingJob.shipWeek === targetWeek) return
    const result = validateMove(movingJob, targetWeek, jobs, DEPARTMENTS)
    if (result.ok) {
      applyMove(jobId, targetWeek)
      return
    }
    setPendingMove({ jobId, targetWeek, failures: result.failures })
  }

  const handleSelect = (job: Job) => {
    setSelectedJob(job)
    setDrawerOpen(true)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-slate-700" />
              <h1 className="text-lg font-semibold">ShopFlow</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">Current Work Sequence - Rolling 4 Weeks</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <label className="flex items-center gap-2">
              Week of
              <select
                value={weekOf}
                onChange={(event) => setWeekOf(event.target.value)}
                className="h-9 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
              >
                <option value="2026-05-04">May 4, 2026</option>
              </select>
            </label>
            <div className="inline-flex rounded border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setView('anne')}
                className={`rounded px-3 py-1.5 text-sm font-medium ${view === 'anne' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Anne's view
              </button>
              <button
                onClick={() => setView('tim')}
                className={`rounded px-3 py-1.5 text-sm font-medium ${view === 'tim' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Tim's view
              </button>
            </div>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">Last updated today 6:42 AM - MRP sync healthy</div>
          <label className="relative block w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
              placeholder="Search MFG #, customer, or order"
            />
          </label>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Department Capacity</h2>
          <p className="text-xs text-slate-500">Hover a cell to see the jobs contributing hours to that department-week.</p>
        </div>
        <CapacityStrip grid={capacityGrid} jobs={jobs} departments={DEPARTMENTS} customers={CUSTOMERS} />
      </section>

      <main className="flex-1 overflow-hidden p-6">
        <SequenceTable
          jobs={visibleJobs}
          customers={CUSTOMERS}
          departments={DEPARTMENTS}
          onRowClick={handleSelect}
          onMove={handleMove}
        />
      </main>

      <JobDrawer
        job={selectedJob}
        customers={CUSTOMERS}
        departments={DEPARTMENTS}
        workers={WORKERS}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <DragWarningModal
        open={pendingMove !== null}
        failures={pendingMove?.failures ?? []}
        onCancel={() => setPendingMove(null)}
        onOverride={(reason) => {
          if (!pendingMove) return
          applyMove(pendingMove.jobId, pendingMove.targetWeek, reason)
          setPendingMove(null)
        }}
      />
    </div>
  )
}
