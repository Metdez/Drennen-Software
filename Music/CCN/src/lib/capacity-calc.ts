import { isWithinInterval, parseISO, startOfWeek, addDays } from "date-fns";
import { createEmptyHoursByDept, DEPARTMENT_CODES } from "@/data/mock-capacity";
import { mockDepartments } from "@/data/mock-departments";
import type { CapacityWeek, DepartmentCode, Job } from "@/data/types";

function getEffectivePressDate(job: Job, reschedules?: Record<string, string>): string | null {
  return reschedules?.[job.jobNumber] ?? job.pressDate;
}

function isDateInWeek(isoDate: string, weekStart: string): boolean {
  const date = parseISO(isoDate);
  const start = parseISO(weekStart);
  const end = addDays(start, 6);

  return isWithinInterval(date, { start, end });
}

export function computeScheduledForDeptWeek(
  jobs: Job[],
  dept: DepartmentCode,
  weekStart: string,
  reschedules?: Record<string, string>,
): number {
  return jobs.reduce((total, job) => {
    const effectivePressDate = getEffectivePressDate(job, reschedules);

    if (!effectivePressDate || !isDateInWeek(effectivePressDate, weekStart)) {
      return total;
    }

    return total + job.hoursByDept[dept];
  }, 0);
}

export function computeCapacityWeeks(
  jobs: Job[],
  weeks: CapacityWeek[],
  reschedules?: Record<string, string>,
): CapacityWeek[] {
  return weeks.map((week) => {
    const scheduledHoursByDept = createEmptyHoursByDept();

    for (const dept of DEPARTMENT_CODES) {
      scheduledHoursByDept[dept] = computeScheduledForDeptWeek(jobs, dept, week.weekStart, reschedules);
    }

    return {
      ...week,
      scheduledHoursByDept,
    };
  });
}

export function computeCapacityMatrix(
  jobs: Job[],
  weeks: CapacityWeek[],
  reschedules?: Record<string, string>,
): {
  matrix: Array<Array<{ scheduled: number; available: number; utilization: number }>>;
  weeklyTotals: Array<{ scheduled: number; available: number; balance: number }>;
  cumulativeBalance: number;
} {
  const computedWeeks = computeCapacityWeeks(jobs, weeks, reschedules);
  const totalAvailable = mockDepartments.reduce((total, dept) => total + dept.weeklyAvailableHours, 0);

  const matrix = mockDepartments.map((dept) =>
    computedWeeks.map((week) => {
      const scheduled = week.scheduledHoursByDept[dept.code];
      const available = dept.weeklyAvailableHours;

      return {
        scheduled,
        available,
        utilization: available === 0 ? 0 : scheduled / available,
      };
    }),
  );

  const weeklyTotals = computedWeeks.map((week) => {
    const scheduled = DEPARTMENT_CODES.reduce((total, dept) => total + week.scheduledHoursByDept[dept], 0);

    return {
      scheduled,
      available: totalAvailable,
      balance: totalAvailable - scheduled,
    };
  });

  const cumulativeBalance = weeklyTotals.reduce((total, week) => total + week.balance, 0);

  return { matrix, weeklyTotals, cumulativeBalance };
}

export function getWeekStartForDate(isoDate: string): string {
  return startOfWeek(parseISO(isoDate), { weekStartsOn: 1 }).toISOString().slice(0, 10);
}
