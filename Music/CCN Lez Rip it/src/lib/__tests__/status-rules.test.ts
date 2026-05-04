import { describe, expect, it } from 'vitest'
import { JOBS } from '@/data/mock-jobs'
import { getDerivedStatus, getRiskReasons } from '../status-rules'

describe('status-rules', () => {
  it('flags a critical shortage after ship date', () => {
    const job = JOBS.find((j) => j.id === 'j_36314')
    expect(job).toBeDefined()
    expect(getRiskReasons(job!)).toContain('1 critical part due after ship date')
  })

  it('flags incomplete engineering work', () => {
    const job = JOBS.find((j) => j.id === 'j_36302')
    expect(job).toBeDefined()
    expect(getRiskReasons(job!)).toContain('Engineering or BOM is not complete')
  })

  it('derives blocked status from critical risk', () => {
    const job = JOBS.find((j) => j.id === 'j_36314')
    expect(getDerivedStatus(job!)).toBe('blocked')
  })

  it('derives healthy status when no risks are present', () => {
    const job = JOBS.find((j) => j.id === 'j_36298')
    expect(getDerivedStatus(job!)).toBe('healthy')
  })

  it('preserves explicit hold status', () => {
    const job = { ...JOBS[0], status: 'hold' as const }
    expect(getDerivedStatus(job)).toBe('hold')
  })
})
