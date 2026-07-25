import { describe, expect, it } from 'vitest'
import { buildCoOccurrenceReport } from '../../src/domain/coOccurrence'
import type { Store } from '../../src/domain/types'

const habits = [
  { id: 'a', name: 'A', targetPerDay: 1, createdOn: '2026-07-01', archivedOn: null },
  { id: 'b', name: 'B', targetPerDay: 2, createdOn: '2026-07-01', archivedOn: null }
]

describe('same-day co-occurrence', () => {
  it('splits shared valid days into both complete, both incomplete and opposite', () => {
    const store: Store = {
      version: 1,
      habits,
      completions: [
        { habitId: 'a', date: '2026-07-21', count: 1 },
        { habitId: 'b', date: '2026-07-21', count: 2 },
        { habitId: 'a', date: '2026-07-22', count: 1 },
        { habitId: 'b', date: '2026-07-23', count: 2 }
      ]
    }
    const pair = buildCoOccurrenceReport(store, '2026-07-25', 7).pairs[0]

    expect(pair.commonDays).toBe(7)
    expect(pair.bothComplete).toBe(1)
    expect(pair.bothIncomplete).toBe(4)
    expect(pair.opposite).toBe(2)
    expect(pair.sampleLevel).toBe('preliminary')
  })

  it('keeps fewer than seven shared days out of rankings', () => {
    const shortStore: Store = {
      version: 1,
      habits: habits.map((habit) => ({ ...habit, createdOn: '2026-07-20' })),
      completions: []
    }
    const report = buildCoOccurrenceReport(shortStore, '2026-07-25', 30)

    expect(report.pairs[0].sampleLevel).toBe('collecting')
    expect(report.leadingPair).toBeNull()
  })

  it('uses only dates active for both habits and becomes rankable at fourteen days', () => {
    const store: Store = {
      version: 1,
      habits: [
        { id: 'a', name: 'A', targetPerDay: 1, createdOn: '2026-07-01', archivedOn: '2026-07-22' },
        { id: 'b', name: 'B', targetPerDay: 1, createdOn: '2026-07-11', archivedOn: null }
      ],
      completions: []
    }
    const pair = buildCoOccurrenceReport(store, '2026-07-25', 30).pairs[0]

    expect(pair.commonDays).toBe(12)
    expect(pair.sampleLevel).toBe('preliminary')

    const rankableStore: Store = {
      ...store,
      habits: store.habits.map((habit) => ({ ...habit, archivedOn: null }))
    }
    const rankable = buildCoOccurrenceReport(rankableStore, '2026-07-25', 30).pairs[0]
    expect(rankable.commonDays).toBe(14)
    expect(rankable.sampleLevel).toBe('rankable')
  })

  it('uses exact daily targets and reports displayed shares that always total one hundred', () => {
    const store: Store = {
      version: 1,
      habits,
      completions: [
        { habitId: 'a', date: '2026-07-24', count: 2 },
        { habitId: 'b', date: '2026-07-24', count: 1 }
      ]
    }
    const pair = buildCoOccurrenceReport(store, '2026-07-25', 7).pairs[0]
    const percentageTotal = pair.bothCompleteRate + pair.bothIncompleteRate + pair.oppositeRate

    expect(pair.bothComplete + pair.bothIncomplete + pair.opposite).toBe(pair.commonDays)
    expect(pair.bothIncomplete).toBe(7)
    expect(percentageTotal).toBe(100)
  })

  it('keeps the dates for each co-occurrence outcome separate and accurate', () => {
    const store: Store = {
      version: 1,
      habits: habits.map((habit) => ({ ...habit, targetPerDay: 1 })),
      completions: [
        { habitId: 'a', date: '2026-07-21', count: 1 },
        { habitId: 'b', date: '2026-07-21', count: 1 },
        { habitId: 'a', date: '2026-07-22', count: 1 },
        { habitId: 'b', date: '2026-07-23', count: 1 }
      ]
    }

    const pair = buildCoOccurrenceReport(store, '2026-07-25', 7).pairs[0]

    expect(pair.bothCompleteDates).toEqual(['2026-07-21'])
    expect(pair.bothIncompleteDates).toEqual(['2026-07-18', '2026-07-19', '2026-07-20', '2026-07-24'])
    expect(pair.oppositeDates).toEqual(['2026-07-22', '2026-07-23'])
  })

  it('selects the leading rankable pair by rate and common days', () => {
    const store: Store = {
      version: 1,
      habits: [
        { id: 'a', name: 'Alpha', targetPerDay: 1, createdOn: '2026-07-01', archivedOn: null },
        { id: 'b', name: 'Beta', targetPerDay: 1, createdOn: '2026-07-01', archivedOn: null },
        { id: 'c', name: 'Gamma', targetPerDay: 1, createdOn: '2026-07-10', archivedOn: null },
        { id: 'd', name: 'Delta', targetPerDay: 1, createdOn: '2026-07-10', archivedOn: null }
      ],
      completions: [
        ...Array.from({ length: 15 }, (_, index) => {
          const date = `2026-07-${String(index + 10).padStart(2, '0')}`
          return [
            { habitId: 'c', date, count: 1 },
            { habitId: 'd', date, count: 1 },
            ...(index % 2 === 0
              ? [{ habitId: 'a', date, count: 1 }]
              : [{ habitId: 'b', date, count: 1 }])
          ]
        }).flat()
      ]
    }
    const report = buildCoOccurrenceReport(store, '2026-07-25', 30)

    expect(report.leadingPair?.habitAName).toBe('Gamma')
    expect(report.leadingPair?.habitBName).toBe('Delta')
  })

  it('uses names to stably break a complete ranking tie', () => {
    const store: Store = {
      version: 1,
      habits: [
        { id: 'a', name: 'Alpha', targetPerDay: 1, createdOn: '2026-07-11', archivedOn: null },
        { id: 'b', name: 'Beta', targetPerDay: 1, createdOn: '2026-07-11', archivedOn: null },
        { id: 'c', name: 'Gamma', targetPerDay: 1, createdOn: '2026-07-11', archivedOn: null }
      ],
      completions: Array.from({ length: 14 }, (_, index) => {
        const date = `2026-07-${String(index + 11).padStart(2, '0')}`
        return [
          { habitId: 'a', date, count: 1 },
          { habitId: 'b', date, count: 1 },
          { habitId: 'c', date, count: 1 }
        ]
      }).flat()
    }

    const report = buildCoOccurrenceReport(store, '2026-07-25', 30)

    expect(report.leadingPair?.habitAName).toBe('Alpha')
    expect(report.leadingPair?.habitBName).toBe('Beta')
  })
})
