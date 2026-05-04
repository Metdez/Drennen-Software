import type { Department, DragValidationFailure, DragValidationResult, Job, WeekIndex } from '@/types'
import { WEEK_SHIP_DATES } from './date-utils'

export function validateMove(
  movingJob: Job,
  targetWeek: WeekIndex,
  allJobs: Job[],
  departments: Department[],
): DragValidationResult {
  const targetShipDate = WEEK_SHIP_DATES[targetWeek]
  const failures: DragValidationFailure[] = []

  if (movingJob.hardCustomerDate && targetShipDate > movingJob.hardCustomerDate) {
    failures.push({
      type: 'hard_date',
      message: `Moving #${movingJob.mfgNumber} to Week ${targetWeek} misses ${movingJob.hardCustomerDate}.`,
      details: movingJob.hardDateNote,
    })
  }

  const lateShortages = movingJob.shortages.filter((part) => part.critical && part.etaDate > targetShipDate)
  if (lateShortages.length > 0) {
    failures.push({
      type: 'shortage',
      message: `${lateShortages.length} critical part${lateShortages.length === 1 ? '' : 's'} arrive after the target ship date.`,
      details: lateShortages.map((part) => `${part.partName}: ${part.etaDate}`).join(', '),
    })
  }

  if (!movingJob.drawingsApprovedDate || !movingJob.bomCompleteDate) {
    failures.push({
      type: 'engineering',
      message: 'Engineering is not fully ready for this move.',
      details: 'Drawings and BOM must be complete before Anne can trust the sequence.',
    })
  }

  for (const hours of movingJob.departmentHours) {
    const department = departments.find((dept) => dept.id === hours.departmentId)
    if (!department) continue
    const targetLoad = allJobs
      .filter((job) => job.id !== movingJob.id && job.shipWeek === targetWeek)
      .flatMap((job) => job.departmentHours)
      .filter((h) => h.departmentId === hours.departmentId)
      .reduce((sum, h) => sum + h.hours, 0)
    const utilization = Math.round(((targetLoad + hours.hours) / department.weeklyCapacityHours) * 100)
    if (utilization > 100) {
      failures.push({
        type: 'capacity',
        message: `${department.name} would be ${utilization}% loaded in Week ${targetWeek}.`,
        details: `${targetLoad + hours.hours}h scheduled against ${department.weeklyCapacityHours}h available.`,
      })
    }
  }

  return failures.length > 0 ? { ok: false, failures } : { ok: true }
}
