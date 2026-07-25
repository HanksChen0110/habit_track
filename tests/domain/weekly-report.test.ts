import { describe, expect, it } from 'vitest'
import { buildWeeklyReport } from '../../src/domain/weeklyReport'
import type { Store } from '../../src/domain/types'

const store: Store = {
  version: 1,
  habits: [
    { id: 'read', name: '阅读', targetPerDay: 1, createdOn: '2026-07-13', archivedOn: null },
    { id: 'english', name: '英语', targetPerDay: 2, createdOn: '2026-07-22', archivedOn: null }
  ],
  completions: [
    { habitId: 'read', date: '2026-07-20', count: 1 },
    { habitId: 'read', date: '2026-07-21', count: 1 },
    { habitId: 'read', date: '2026-07-22', count: 1 },
    { habitId: 'read', date: '2026-07-23', count: 1 },
    { habitId: 'read', date: '2026-07-24', count: 1 },
    { habitId: 'english', date: '2026-07-22', count: 1 },
    { habitId: 'english', date: '2026-07-23', count: 2 },
    { habitId: 'read', date: '2026-07-13', count: 1 },
    { habitId: 'read', date: '2026-07-14', count: 1 },
    { habitId: 'read', date: '2026-07-15', count: 1 },
    { habitId: 'read', date: '2026-07-16', count: 1 },
    { habitId: 'read', date: '2026-07-17', count: 1 }
  ]
}

describe('weekly execution review', () => {
  it('excludes future dates from the current week and counts partial units', () => {
    const report = buildWeeklyReport(store, '2026-07-20', '2026-07-24')

    expect(report.isCurrentWeek).toBe(true)
    expect(report.days).toHaveLength(5)
    expect(report.actualTotal).toBe(8)
    expect(report.plannedTotal).toBe(11)
    expect(report.overallRate).toBe(73)
  })

  it('compares only the immediately preceding completed week', () => {
    const report = buildWeeklyReport(store, '2026-07-20', '2026-07-24')

    expect(report.previousWeekRate).toBe(71)
    expect(report.deltaPercentagePoints).toBe(2)
  })

  it('marks no-plan days and omits patterns with fewer than two comparable days', () => {
    const singleDayStore: Store = {
      version: 1,
      habits: [
        { id: 'new', name: '新习惯', targetPerDay: 1, createdOn: '2026-07-24', archivedOn: null }
      ],
      completions: []
    }
    const report = buildWeeklyReport(singleDayStore, '2026-07-20', '2026-07-24')

    expect(report.days.slice(0, 4).every((day) => day.rate === null)).toBe(true)
    expect(report.bestDates).toEqual([])
    expect(report.worstDates).toEqual([])
  })

  it('includes all seven days for a finished week and preserves tied best and worst dates', () => {
    const tiedStore: Store = {
      version: 1,
      habits: [
        { id: 'read', name: '阅读', targetPerDay: 1, createdOn: '2026-07-06', archivedOn: null }
      ],
      completions: [
        { habitId: 'read', date: '2026-07-06', count: 1 },
        { habitId: 'read', date: '2026-07-07', count: 1 }
      ]
    }
    const report = buildWeeklyReport(tiedStore, '2026-07-06', '2026-07-24')

    expect(report.days).toHaveLength(7)
    expect(report.bestDates).toEqual(['2026-07-06', '2026-07-07'])
    expect(report.worstDates).toEqual([
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12'
    ])
  })
})
