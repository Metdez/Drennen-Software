import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusFlag } from './StatusFlag'
import { StatusTimeline } from './StatusTimeline'
import { ShortageList } from './ShortageList'
import { LoriNoteBanner } from './LoriNoteBanner'
import { DepartmentHoursList } from './DepartmentHoursList'
import { getDerivedStatus, getRiskReasons } from '@/lib/status-rules'
import type { Customer, Department, Job, Worker } from '@/types'

export function JobDrawer({
  job,
  customers,
  departments,
  workers,
  open,
  onOpenChange,
}: {
  job: Job | null
  customers: Customer[]
  departments: Department[]
  workers: Worker[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const customer = job ? customers.find((item) => item.id === job.customerId) : undefined
  const risks = job ? getRiskReasons(job) : []
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[480px]">
        {job && (
          <>
            <SheetHeader>
              <SheetTitle className="text-base">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-700">#{job.mfgNumber}</span>
                  <StatusFlag status={getDerivedStatus(job)} />
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">{customer?.name}</div>
                <div className="text-xs font-normal text-slate-500">{job.contractTitle}</div>
              </SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Fact label="Ship date" value={job.shipDate} />
                <Fact label="Square feet" value={job.squareFootage ? String(job.squareFootage) : '-'} />
                <Fact label="Drafter" value={job.drafter ?? '-'} />
                <Fact label="BOM" value={`${job.bomCompletionPercent ?? 0}%`} />
              </div>

              <LoriNoteBanner job={job} />

              <Section title="Status timeline">
                <StatusTimeline job={job} />
              </Section>

              <Section title="Risk reasons">
                {risks.length === 0 ? (
                  <p className="text-xs text-slate-500">No current conflicts.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-red-800">
                    {risks.map((risk) => <li key={risk}>{risk}</li>)}
                  </ul>
                )}
              </Section>

              <Section title="Shortages">
                <ShortageList shortages={job.shortages} />
              </Section>

              <Section title="Department hours and workers">
                <DepartmentHoursList hours={job.departmentHours} departments={departments} workers={workers} />
              </Section>

              <Section title="Notes / audit log">
                {job.auditLog.length === 0 ? (
                  <p className="text-xs text-slate-500">No entries.</p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {job.auditLog.map((entry, index) => (
                      <li key={`${entry.date}-${entry.action}-${index}`} className="text-slate-700">
                        <span className="font-mono text-slate-500">{entry.date}</span>{' '}
                        <span className="font-medium">{entry.user}</span>: {entry.action}
                        {entry.reason && <div className="mt-0.5 text-slate-500">Reason: {entry.reason}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 p-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 font-mono font-medium text-slate-900">{value}</div>
    </div>
  )
}
