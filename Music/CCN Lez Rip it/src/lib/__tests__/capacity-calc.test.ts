import { describe, expect, it } from 'vitest'
import { DEPARTMENTS } from '@/data/mock-departments'
import { JOBS } from '@/data/mock-jobs'
import { computeCapacityGrid, getCapacityContributors, getCapacityStatus, getWeekTotal } from '../capacity-calc'

describe('capacity-calc', () => {
  it('computes one capacity cell per department per demo week', () => {
    const grid = computeCapacityGrid(JOBS, DEPARTMENTS)
    expect(grid).toHaveLength(DEPARTMENTS.length * 4)
  })

  it('marks utilization above 100 as red', () => {
    expect(getCapacityStatus(101)).toBe('red')
  })

  it('marks utilization from 80 through 100 as amber', () => {
    expect(getCapacityStatus(80)).toBe('amber')
    expect(getCapacityStatus(100)).toBe('amber')
  })

  it('marks utilization below 80 as green', () => {
    expect(getCapacityStatus(79)).toBe('green')
  })

  it('adds all department hours for a week', () => {
    expect(getWeekTotal(JOBS, 1)).toBe(286)
  })

  it('creates at least one overloaded cell for the demo walkthrough', () => {
    const grid = computeCapacityGrid(JOBS, DEPARTMENTS)
    expect(grid.some((cell) => cell.status === 'red')).toBe(true)
  })

  it('lists jobs contributing hours to a department week', () => {
    const contributors = getCapacityContributors(JOBS, 'case_goods', 1)
    expect(contributors).toEqual([
      { jobId: 'j_36284', mfgNumber: '36284', customerId: 'c_acme', hours: 64 },
      { jobId: 'j_36287', mfgNumber: '36287', customerId: 'c_summit', hours: 38 },
    ])
  })
})
