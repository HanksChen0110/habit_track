import { addDays, getWeekStart } from './dates'
import { isHabitActiveOn } from './store'
import type { DateKey, Habit, Store } from './types'
import type {
  HabitInsight,
  InsightRange,
  InsightReport,
  InsightTrendPoint,
  InsightWindow,
  TrendDirection
} from './insightTypes'

interface Totals {
  actual: number
  planned: number
  validDays: number
}

const rate = (actual: number, planned: number): number | null =>
  planned === 0 ? null : Math.round((actual / planned) * 100)

const trendFromDelta = (delta: number | null): TrendDirection => {
  if (delta === null) return 'unavailable'
  if (delta >= 3) return 'up'
  if (delta <= -3) return 'down'
  return 'stable'
}

export function getInsightWindow(today: DateKey, range: InsightRange): InsightWindow {
  const end = addDays(today, -1)
  const start = addDays(end, 1 - range)
  const previousEnd = addDays(start, -1)
  return {
    range,
    start,
    end,
    previousStart: addDays(previousEnd, 1 - range),
    previousEnd
  }
}

export function getInsightDates(window: InsightWindow): DateKey[] {
  return Array.from({ length: window.range }, (_, index) => addDays(window.start, index))
}

function completionIndex(store: Store): Map<string, number> {
  return new Map(store.completions.map((item) => [`${item.habitId}:${item.date}`, item.count]))
}

function getTotals(
  habits: Habit[],
  dates: DateKey[],
  completions: Map<string, number>
): Totals {
  return dates.reduce<Totals>(
    (totals, date) => {
      const activeHabits = habits.filter((habit) => isHabitActiveOn(habit, date))
      const planned = activeHabits.reduce((sum, habit) => sum + habit.targetPerDay, 0)
      const actual = activeHabits.reduce(
        (sum, habit) =>
          sum + Math.min(completions.get(`${habit.id}:${date}`) ?? 0, habit.targetPerDay),
        0
      )
      return {
        actual: totals.actual + actual,
        planned: totals.planned + planned,
        validDays: totals.validDays + (planned > 0 ? 1 : 0)
      }
    },
    { actual: 0, planned: 0, validDays: 0 }
  )
}

function makePoint(
  key: string,
  start: DateKey,
  end: DateKey,
  totals: Totals,
  smoothedRate: number | null = null
): InsightTrendPoint {
  return {
    key,
    start,
    end,
    actual: totals.actual,
    planned: totals.planned,
    rate: rate(totals.actual, totals.planned),
    smoothedRate
  }
}

function buildAllHabitSeries(
  store: Store,
  dates: DateKey[],
  range: InsightRange,
  completions: Map<string, number>
): InsightTrendPoint[] {
  if (range === 90) {
    const groups = new Map<DateKey, DateKey[]>()
    for (const date of dates) {
      const weekStart = getWeekStart(date)
      groups.set(weekStart, [...(groups.get(weekStart) ?? []), date])
    }
    return [...groups.entries()].map(([start, weekDates]) =>
      makePoint(start, start, weekDates[weekDates.length - 1], getTotals(store.habits, weekDates, completions))
    )
  }

  return dates.map((date) => {
    const totals = getTotals(store.habits, [date], completions)
    if (range !== 30) return makePoint(date, date, date, totals)

    const smoothingDates = Array.from({ length: 7 }, (_, index) => addDays(date, index - 6))
    const smoothed = getTotals(store.habits, smoothingDates, completions)
    return makePoint(date, date, date, totals, rate(smoothed.actual, smoothed.planned))
  })
}

export function buildHabitTrend(
  store: Store,
  today: DateKey,
  range: InsightRange,
  habitId: string
): InsightTrendPoint[] {
  const habit = store.habits.find((item) => item.id === habitId)
  if (!habit) return []
  const window = getInsightWindow(today, range)
  const habitStore = { ...store, habits: [habit] }
  return buildAllHabitSeries(
    habitStore,
    getInsightDates(window),
    range,
    completionIndex(habitStore)
  )
}

export function buildInsightReport(
  store: Store,
  today: DateKey,
  range: InsightRange
): InsightReport {
  const window = getInsightWindow(today, range)
  const dates = getInsightDates(window)
  const previousDates = Array.from({ length: range }, (_, index) => addDays(window.previousStart, index))
  const completions = completionIndex(store)
  const totals = getTotals(store.habits, dates, completions)
  const previousTotals = getTotals(store.habits, previousDates, completions)
  const overallRate = rate(totals.actual, totals.planned)
  const previousRate = rate(previousTotals.actual, previousTotals.planned)

  const minimumValidDays = range === 7 ? 3 : 7
  const habits = store.habits.map<HabitInsight>((habit) => {
    const habitTotals = getTotals([habit], dates, completions)
    const previousHabitTotals = getTotals([habit], previousDates, completions)
    const habitRate = rate(habitTotals.actual, habitTotals.planned)
    const habitPreviousRate = rate(previousHabitTotals.actual, previousHabitTotals.planned)
    const deltaPercentagePoints =
      habitRate === null || habitPreviousRate === null ? null : habitRate - habitPreviousRate

    return {
      habitId: habit.id,
      name: habit.name,
      actual: habitTotals.actual,
      planned: habitTotals.planned,
      rate: habitRate,
      validDays: habitTotals.validDays,
      previousRate: habitPreviousRate,
      deltaPercentagePoints,
      trend: trendFromDelta(deltaPercentagePoints),
      qualifiesForHighlights: habitTotals.validDays >= minimumValidDays
    }
  })

  const highlighted = habits.filter((habit) => habit.qualifiesForHighlights)
  const bestHabit = [...highlighted].sort((left, right) => (right.rate ?? -1) - (left.rate ?? -1))[0] ?? null
  const declining = highlighted.filter((habit) => habit.trend === 'down')
  const attentionHabit =
    [...(declining.length > 0 ? declining : highlighted)].sort((left, right) => {
      if (declining.length > 0) {
        return (left.deltaPercentagePoints ?? Infinity) - (right.deltaPercentagePoints ?? Infinity)
      }
      return (left.rate ?? Infinity) - (right.rate ?? Infinity)
    })[0] ?? null

  return {
    window,
    actualTotal: totals.actual,
    plannedTotal: totals.planned,
    overallRate,
    previousRate,
    deltaPercentagePoints:
      overallRate === null || previousRate === null ? null : overallRate - previousRate,
    plannedDays: totals.validDays,
    series: buildAllHabitSeries(store, dates, range, completions),
    habits,
    bestHabit,
    attentionHabit
  }
}
