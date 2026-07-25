import { describe, expect, it } from 'vitest'
import { buildInsightReport } from '../../src/domain/insights'
import type { Store } from '../../src/domain/types'

const store: Store = {
  version: 1,
  habits: [
    { id: 'one', name: '每日一次', targetPerDay: 1, createdOn: '2026-06-01', archivedOn: null },
    { id: 'two', name: '每日两次', targetPerDay: 2, createdOn: '2026-06-01', archivedOn: null }
  ],
  completions: [
    { habitId: 'one', date: '2026-07-23', count: 1 },
    { habitId: 'two', date: '2026-07-23', count: 1 },
    { habitId: 'one', date: '2026-07-24', count: 1 },
    { habitId: 'one', date: '2026-07-25', count: 1 }
  ]
}

describe('long-term insight report', () => {
  it('uses yesterday as the end and weights actual units by target units', () => {
    const report = buildInsightReport(store, '2026-07-25', 7)

    expect(report.window.end).toBe('2026-07-24')
    expect(report.window.start).toBe('2026-07-18')
    expect(report.actualTotal).toBe(3)
    expect(report.plannedTotal).toBe(21)
    expect(report.overallRate).toBe(14)
    expect(report.series.some((point) => point.start === '2026-07-25')).toBe(false)
  })

  it('uses the immediately preceding equal window for percentage-point change', () => {
    const report = buildInsightReport(store, '2026-07-25', 7)
    expect(report.window.previousStart).toBe('2026-07-11')
    expect(report.window.previousEnd).toBe('2026-07-17')
    expect(report.previousRate).toBe(0)
    expect(report.deltaPercentagePoints).toBe(14)
  })

  it('excludes dates outside habit lifecycle and keeps no-plan days out of the denominator', () => {
    const report = buildInsightReport({
      version: 1,
      habits: [
        { id: 'short', name: '短期', targetPerDay: 1, createdOn: '2026-07-22', archivedOn: '2026-07-23' }
      ],
      completions: [{ habitId: 'short', date: '2026-07-22', count: 1 }]
    }, '2026-07-25', 7)

    expect(report.actualTotal).toBe(1)
    expect(report.plannedTotal).toBe(2)
    expect(report.plannedDays).toBe(2)
  })

  it('does not promote a one-day habit to best or attention', () => {
    const report = buildInsightReport({
      version: 1,
      habits: [
        { id: 'new', name: '新习惯', targetPerDay: 1, createdOn: '2026-07-24', archivedOn: null }
      ],
      completions: [{ habitId: 'new', date: '2026-07-24', count: 1 }]
    }, '2026-07-25', 30)

    expect(report.habits[0].qualifiesForHighlights).toBe(false)
    expect(report.bestHabit).toBeNull()
    expect(report.attentionHabit).toBeNull()
  })
})
