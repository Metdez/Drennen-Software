import type { Department, DepartmentId, DeptWeekCapacity, Job, WeekIndex } from '@/types'
import { WEEKS } from './date-utils'

export function computeCapacityGrid(jobs: Job[], departments: Department[]): DeptWeekCapacity[] {
  return departments.flatMap((department) =>
    WEEKS.map((week) => {
      const scheduledHours = jobs
        .filter((job) => job.shipWeek === week && job.status !== 'hold')
        .flatMap((job) => job.departmentHours)
        .filter((hours) => hours.departmentId === department.id)
        .reduce((sum, hours) => sum + hours.hours, 0)
      const utilizationPercent = department.weeklyCapacityHours === 0
        ? 0
        : Math.round((scheduledHours / department.weeklyCapacityHours) * 100)
      return {
        departmentId: department.id,
        week,
        scheduledHours,
        capacityHours: department.weeklyCapacityHours,
        utilizationPercent,
        status: getCapacityStatus(utilizationPercent),
      }
    }),
  )
}

export function getCapacityStatus(utilizationPercent: number): DeptWeekCapacity['status'] {
  if (utilizationPercent > 100) return 'red'
  if (utilizationPercent >= 80) return 'amber'
  return 'green'
}

export function getWeekTotal(jobs: Job[], week: WeekIndex) {
  return jobs
    .filter((job) => job.shipWeek === week)
    .reduce((sum, job) => sum + job.departmentHours.reduce((jobSum, h) => jobSum + h.hours, 0), 0)
}

export function getCapacityContributors(jobs: Job[], departmentId: DepartmentId, week: WeekIndex) {
  return jobs
    .filter((job) => job.shipWeek === week && job.status !== 'hold')
    .map((job) => {
      const hours = job.departmentHours
        .filter((departmentHours) => departmentHours.departmentId === departmentId)
        .reduce((sum, departmentHours) => sum + departmentHours.hours, 0)
      return {
        jobId: job.id,
        mfgNumber: job.mfgNumber,
        customerId: job.customerId,
        hours,
      }
    })
    .filter((contributor) => contributor.hours > 0)
}
