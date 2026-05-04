import { describe, expect, it } from 'vitest'
import { DEPARTMENTS } from '@/data/mock-departments'
import { JOBS } from '@/data/mock-jobs'
import { validateMove } from '../drag-validation'

describe('drag-validation', () => {
  it('allows a healthy move when the target week has room', () => {
    const job = JOBS.find((j) => j.id === 'j_36281')!
    expect(validateMove(job, 4, JOBS, DEPARTMENTS)).toEqual({ ok: true })
  })

  it('blocks moves that miss a hard customer date', () => {
    const job = JOBS.find((j) => j.id === 'j_36284')!
    const result = validateMove(job, 3, JOBS, DEPARTMENTS)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failures.some((failure) => failure.type === 'hard_date')).toBe(true)
    }
  })

  it('blocks moves that ship before critical parts arrive', () => {
    const job = JOBS.find((j) => j.id === 'j_36314')!
    const result = validateMove(job, 4, JOBS, DEPARTMENTS)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failures.some((failure) => failure.type === 'shortage')).toBe(true)
    }
  })

  it('blocks moves that overload a department week', () => {
    const job = JOBS.find((j) => j.id === 'j_36306')!
    const result = validateMove(job, 2, JOBS, DEPARTMENTS)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failures.some((failure) => failure.type === 'capacity')).toBe(true)
    }
  })

  it('blocks moves for incomplete engineering readiness', () => {
    const job = JOBS.find((j) => j.id === 'j_36302')!
    const result = validateMove(job, 3, JOBS, DEPARTMENTS)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failures.some((failure) => failure.type === 'engineering')).toBe(true)
    }
  })
})
