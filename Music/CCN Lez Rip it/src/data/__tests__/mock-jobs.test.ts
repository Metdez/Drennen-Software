import { describe, expect, it } from 'vitest'
import { JOBS } from '../mock-jobs'

describe('mock-jobs', () => {
  it('contains the planned 15-20 job story dataset', () => {
    expect(JOBS.length).toBeGreaterThanOrEqual(15)
    expect(JOBS.length).toBeLessThanOrEqual(20)
  })

  it('includes acknowledged but not started gray-row coverage', () => {
    expect(JOBS.some((job) => job.status === 'acknowledged')).toBe(true)
  })
})
