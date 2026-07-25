export type DateKey = string

export interface Habit {
  id: string
  name: string
  targetPerDay: number
  createdOn: DateKey
  archivedOn: DateKey | null
}

export interface Completion {
  habitId: string
  date: DateKey
  count: number
}

export interface Store {
  version: 1
  habits: Habit[]
  completions: Completion[]
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

export interface DayReport {
  date: DateKey
  actual: number
  planned: number
  rate: number | null
}

export interface WeeklyReport {
  weekStart: DateKey
  weekEnd: DateKey
  isCurrentWeek: boolean
  days: DayReport[]
  actualTotal: number
  plannedTotal: number
  overallRate: number | null
  bestDates: DateKey[]
  worstDates: DateKey[]
  previousWeekRate: number | null
  deltaPercentagePoints: number | null
}
