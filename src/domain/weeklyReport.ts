import { addDays, compareDateKeys, getWeekDates, getWeekStart } from './dates'
import { isHabitActiveOn } from './store'
import type { DayReport, Store, WeeklyReport } from './types'

function roundRate(actual: number, planned: number): number | null {
  return planned === 0 ? null : Math.round((actual / planned) * 100)
}

function buildDay(store: Store, date: string): DayReport {
  const activeHabits = store.habits.filter((habit) => isHabitActiveOn(habit, date))
  const planned = activeHabits.reduce((sum, habit) => sum + habit.targetPerDay, 0)
  const actual = activeHabits.reduce((sum, habit) => {
    const completion = store.completions.find(
      (item) => item.habitId === habit.id && item.date === date
    )
    return sum + Math.min(completion?.count ?? 0, habit.targetPerDay)
  }, 0)

  return { date, actual, planned, rate: roundRate(actual, planned) }
}

function buildFullWeekTotals(store: Store, weekStart: string) {
  const days = getWeekDates(weekStart).map((date) => buildDay(store, date))
  const actual = days.reduce((sum, day) => sum + day.actual, 0)
  const planned = days.reduce((sum, day) => sum + day.planned, 0)
  return { actual, planned, rate: roundRate(actual, planned) }
}

export function buildWeeklyReport(
  store: Store,
  weekStart: string,
  today: string
): WeeklyReport {
  const currentWeekStart = getWeekStart(today)
  const isCurrentWeek = weekStart === currentWeekStart
  const weekEnd = addDays(weekStart, 6)
  const dates = getWeekDates(weekStart).filter(
    (date) => !isCurrentWeek || compareDateKeys(date, today) <= 0
  )
  const days = dates.map((date) => buildDay(store, date))
  const actualTotal = days.reduce((sum, day) => sum + day.actual, 0)
  const plannedTotal = days.reduce((sum, day) => sum + day.planned, 0)
  const overallRate = roundRate(actualTotal, plannedTotal)
  const comparable = days.filter((day): day is DayReport & { rate: number } => day.rate !== null)

  let bestDates: string[] = []
  let worstDates: string[] = []
  if (comparable.length >= 2) {
    const rates = comparable.map((day) => day.rate)
    const bestRate = Math.max(...rates)
    const worstRate = Math.min(...rates)
    bestDates = comparable.filter((day) => day.rate === bestRate).map((day) => day.date)
    worstDates = comparable.filter((day) => day.rate === worstRate).map((day) => day.date)
  }

  const previous = buildFullWeekTotals(store, addDays(weekStart, -7))
  const previousWeekRate = previous.rate
  const deltaPercentagePoints =
    overallRate === null || previousWeekRate === null ? null : overallRate - previousWeekRate

  return {
    weekStart,
    weekEnd,
    isCurrentWeek,
    days,
    actualTotal,
    plannedTotal,
    overallRate,
    bestDates,
    worstDates,
    previousWeekRate,
    deltaPercentagePoints
  }
}
