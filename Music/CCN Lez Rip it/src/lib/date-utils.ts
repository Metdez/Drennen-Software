import type { WeekIndex } from '@/types'

export const DEMO_TODAY = '2026-05-04'

export const WEEK_STARTS: Record<WeekIndex, string> = {
  1: '2026-05-04',
  2: '2026-05-11',
  3: '2026-05-18',
  4: '2026-05-25',
}

export const WEEK_LABELS: Record<WeekIndex, string> = {
  1: 'May 4-10',
  2: 'May 11-17',
  3: 'May 18-24',
  4: 'May 25-31',
}

export const WEEK_SHIP_DATES: Record<WeekIndex, string> = {
  1: '2026-05-08',
  2: '2026-05-15',
  3: '2026-05-22',
  4: '2026-05-29',
}

export const WEEKS: WeekIndex[] = [1, 2, 3, 4]

export function formatShortDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}
