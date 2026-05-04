import { describe, expect, it } from 'vitest'
import { JOBS } from '@/data/mock-jobs'
import { sortJobsForView } from '../view-rules'

describe('view-rules', () => {
  it('sorts Anne view by ship week then ship date', () => {
    const sorted = sortJobsForView(JOBS, 'anne')
    expect(sorted.slice(0, 3).map((job) => job.mfgNumber)).toEqual(['36281', '36284', '36287'])
  })

  it('sorts Tim view with blocked and warning capacity risks first', () => {
    const sorted = sortJobsForView(JOBS, 'tim')
    expect(sorted.slice(0, 2).map((job) => job.status)).toEqual(['blocked', 'blocked'])
  })

  it('keeps healthy jobs after warning jobs in Tim view', () => {
    const sorted = sortJobsForView(JOBS, 'tim')
    const firstHealthy = sorted.findIndex((job) => job.status === 'healthy')
    const lastWarning = sorted.reduce((lastIndex, job, index) => (job.status === 'warning' ? index : lastIndex), -1)
    expect(firstHealthy).toBeGreaterThan(lastWarning)
  })
})
