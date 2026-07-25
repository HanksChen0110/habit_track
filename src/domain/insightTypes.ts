import type { DateKey } from './types'

export type InsightRange = 7 | 30 | 90
export type TrendDirection = 'up' | 'stable' | 'down' | 'unavailable'

export interface InsightWindow {
  range: InsightRange
  start: DateKey
  end: DateKey
  previousStart: DateKey
  previousEnd: DateKey
}

export interface InsightTrendPoint {
  key: string
  start: DateKey
  end: DateKey
  actual: number
  planned: number
  rate: number | null
  smoothedRate: number | null
}

export interface HabitInsight {
  habitId: string
  name: string
  actual: number
  planned: number
  rate: number | null
  validDays: number
  previousRate: number | null
  deltaPercentagePoints: number | null
  trend: TrendDirection
  qualifiesForHighlights: boolean
}

export interface InsightReport {
  window: InsightWindow
  actualTotal: number
  plannedTotal: number
  overallRate: number | null
  previousRate: number | null
  deltaPercentagePoints: number | null
  plannedDays: number
  series: InsightTrendPoint[]
  habits: HabitInsight[]
  bestHabit: HabitInsight | null
  attentionHabit: HabitInsight | null
}

export type CoOccurrenceView = 'bothComplete' | 'bothIncomplete' | 'opposite'
export type SampleLevel = 'collecting' | 'preliminary' | 'rankable'

export interface CoOccurrencePair {
  habitAId: string
  habitAName: string
  habitBId: string
  habitBName: string
  commonDays: number
  bothComplete: number
  bothIncomplete: number
  opposite: number
  bothCompleteDates: DateKey[]
  bothIncompleteDates: DateKey[]
  oppositeDates: DateKey[]
  bothCompleteRate: number
  bothIncompleteRate: number
  oppositeRate: number
  sampleLevel: SampleLevel
  dominantView: CoOccurrenceView
  dominantRate: number
}

export interface CoOccurrenceReport {
  pairs: CoOccurrencePair[]
  leadingPair: CoOccurrencePair | null
}
