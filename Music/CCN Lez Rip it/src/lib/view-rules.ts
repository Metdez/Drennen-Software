import type { Job } from '@/types'

export type ShopFlowView = 'anne' | 'tim'

const RISK_RANK: Record<Job['status'], number> = {
  blocked: 0,
  warning: 1,
  acknowledged: 2,
  healthy: 3,
  hold: 4,
}

export function sortJobsForView(jobs: Job[], view: ShopFlowView) {
  return [...jobs].sort((a, b) => {
    if (view === 'tim') {
      const riskDelta = RISK_RANK[a.status] - RISK_RANK[b.status]
      if (riskDelta !== 0) return riskDelta
    }
    if (a.shipWeek !== b.shipWeek) return a.shipWeek - b.shipWeek
    if (a.shipDate !== b.shipDate) return a.shipDate.localeCompare(b.shipDate)
    return a.mfgNumber.localeCompare(b.mfgNumber)
  })
}
