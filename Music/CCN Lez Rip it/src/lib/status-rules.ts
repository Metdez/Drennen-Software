import type { Job } from '@/types'

export function getRiskReasons(job: Job): string[] {
  const reasons: string[] = []
  const criticalLate = job.shortages.filter((part) => part.critical && part.etaDate > job.shipDate)
  if (criticalLate.length > 0) {
    reasons.push(`${criticalLate.length} critical part${criticalLate.length === 1 ? '' : 's'} due after ship date`)
  }
  if (job.hardCustomerDate && job.shipDate > job.hardCustomerDate) {
    reasons.push(`Ship date is after Lori hard date ${job.hardCustomerDate}`)
  }
  if (!job.drawingsApprovedDate || !job.bomCompleteDate || (job.bomCompletionPercent ?? 0) < 100) {
    reasons.push('Engineering or BOM is not complete')
  }
  return reasons
}

export function getDerivedStatus(job: Job): Job['status'] {
  const reasons = getRiskReasons(job)
  if (job.status === 'hold') return 'hold'
  if (job.status === 'acknowledged' && reasons.length === 0) return 'acknowledged'
  if (reasons.some((reason) => reason.includes('critical') || reason.includes('hard date'))) return 'blocked'
  if (reasons.length > 0) return 'warning'
  return 'healthy'
}
