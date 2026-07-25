import { describe, expect, it } from 'vitest'
import { createDemoStore } from '../../src/data/demo'
import { buildCoOccurrenceReport } from '../../src/domain/coOccurrence'
import { addDays } from '../../src/domain/dates'
import { validateStore } from '../../src/domain/store'
import { buildWeeklyReport } from '../../src/domain/weeklyReport'

describe('demo store', () => {
  it('creates valid relative data with a current and previous week report', () => {
    const store = createDemoStore('2026-07-24')
    const report = buildWeeklyReport(store, '2026-07-20', '2026-07-24')

    expect(validateStore(store, '2026-07-24').ok).toBe(true)
    expect(store.habits).toHaveLength(3)
    expect(report.plannedTotal).toBeGreaterThan(0)
    expect(report.previousWeekRate).not.toBeNull()
  })

  it('creates sixty complete historical days for long-term insights', () => {
    const today = '2026-07-25'
    const store = createDemoStore(today)
    const dates = [...new Set(store.completions.map((item) => item.date))].sort()

    expect(store.habits).toHaveLength(3)
    expect(store.habits.every((habit) => habit.createdOn === '2026-05-26')).toBe(true)
    expect(dates[0]).toBe('2026-05-26')
    expect(dates.at(-1)).toBe('2026-07-25')
    expect(dates).toHaveLength(61)
    dates.forEach((date, index) => {
      expect(date).toBe(addDays(today, index - 60))
    })

    const leadingPair = buildCoOccurrenceReport(store, today, 30).leadingPair
    expect(leadingPair?.habitAId).toBe('demo-reading')
    expect(leadingPair?.habitAName).toBe('阅读 30 分钟')
    expect(leadingPair?.habitBId).toBe('demo-exercise')
    expect(leadingPair?.habitBName).toBe('拉伸与训练')
    expect(leadingPair?.commonDays).toBe(30)
    expect(leadingPair?.sampleLevel).toBe('rankable')
  })
})
