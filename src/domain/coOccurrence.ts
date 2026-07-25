import { isHabitActiveOn } from './store'
import { getInsightDates, getInsightWindow } from './insights'
import type { DateKey, Habit, Store } from './types'
import type {
  CoOccurrencePair,
  CoOccurrenceReport,
  CoOccurrenceView,
  InsightRange,
  SampleLevel
} from './insightTypes'

const complete = (store: Store, habit: Habit, date: DateKey) =>
  (store.completions.find(
    (item) => item.habitId === habit.id && item.date === date
  )?.count ?? 0) === habit.targetPerDay

const sampleLevel = (days: number): SampleLevel =>
  days < 7 ? 'collecting' : days < 14 ? 'preliminary' : 'rankable'

const dominantShare = (pair: CoOccurrencePair) =>
  pair.commonDays === 0 ? 0 : Math.max(pair.bothComplete, pair.bothIncomplete, pair.opposite) / pair.commonDays

function percentageShares(counts: number[], total: number): number[] {
  if (total === 0) return counts.map(() => 0)
  const exact = counts.map((count) => (count / total) * 100)
  const shares = exact.map(Math.floor)
  let remaining = 100 - shares.reduce((sum, share) => sum + share, 0)

  exact
    .map((value, index) => ({ index, remainder: value - shares[index] }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
    .forEach(({ index }) => {
      if (remaining <= 0) return
      shares[index] += 1
      remaining -= 1
    })

  return shares
}

function buildPair(store: Store, habitA: Habit, habitB: Habit, dates: DateKey[]): CoOccurrencePair {
  let commonDays = 0
  let bothComplete = 0
  let bothIncomplete = 0
  let opposite = 0
  const bothCompleteDates: DateKey[] = []
  const bothIncompleteDates: DateKey[] = []
  const oppositeDates: DateKey[] = []

  for (const date of dates) {
    if (!isHabitActiveOn(habitA, date) || !isHabitActiveOn(habitB, date)) continue

    commonDays += 1
    const aComplete = complete(store, habitA, date)
    const bComplete = complete(store, habitB, date)
    if (aComplete && bComplete) {
      bothComplete += 1
      bothCompleteDates.push(date)
    } else if (!aComplete && !bComplete) {
      bothIncomplete += 1
      bothIncompleteDates.push(date)
    } else {
      opposite += 1
      oppositeDates.push(date)
    }
  }

  const shares = percentageShares([bothComplete, bothIncomplete, opposite], commonDays)
  const rates: Array<[CoOccurrenceView, number]> = [
    ['bothComplete', shares[0]],
    ['bothIncomplete', shares[1]],
    ['opposite', shares[2]]
  ]
  const [dominantView, dominantRate] = rates.reduce(
    (dominant, current) => (current[1] > dominant[1] ? current : dominant)
  )

  return {
    habitAId: habitA.id,
    habitAName: habitA.name,
    habitBId: habitB.id,
    habitBName: habitB.name,
    commonDays,
    bothComplete,
    bothIncomplete,
    opposite,
    bothCompleteDates,
    bothIncompleteDates,
    oppositeDates,
    bothCompleteRate: rates[0][1],
    bothIncompleteRate: rates[1][1],
    oppositeRate: rates[2][1],
    sampleLevel: sampleLevel(commonDays),
    dominantView,
    dominantRate
  }
}

export function buildCoOccurrenceReport(
  store: Store,
  today: DateKey,
  range: InsightRange
): CoOccurrenceReport {
  const dates = getInsightDates(getInsightWindow(today, range))
  const pairs: CoOccurrencePair[] = []

  for (let index = 0; index < store.habits.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < store.habits.length; nextIndex += 1) {
      pairs.push(buildPair(store, store.habits[index], store.habits[nextIndex], dates))
    }
  }

  const leadingPair = [...pairs]
    .filter((pair) => pair.sampleLevel === 'rankable')
    .sort((left, right) =>
      dominantShare(right) - dominantShare(left) ||
      right.commonDays - left.commonDays ||
      `${left.habitAName}${left.habitBName}`.localeCompare(`${right.habitAName}${right.habitBName}`)
    )[0] ?? null

  return { pairs, leadingPair }
}
