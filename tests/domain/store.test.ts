import { describe, expect, it } from 'vitest'
import {
  adjustCompletion,
  archiveHabit,
  createHabit,
  editHabit,
  isHabitActiveOn,
  validateStore
} from '../../src/domain/store'
import type { Store } from '../../src/domain/types'

const emptyStore = (): Store => ({ version: 1, habits: [], completions: [] })

describe('habit lifecycle and completion commands', () => {
  it('creates a habit active on its creation date', () => {
    const next = createHabit(emptyStore(), {
      id: 'reading',
      name: '  阅读  ',
      targetPerDay: 1,
      today: '2026-07-24'
    })

    expect(next.habits[0]).toMatchObject({
      id: 'reading',
      name: '阅读',
      targetPerDay: 1,
      createdOn: '2026-07-24',
      archivedOn: null
    })
    expect(isHabitActiveOn(next.habits[0], '2026-07-24')).toBe(true)
  })

  it('keeps the archive date active and excludes the following day', () => {
    const created = createHabit(emptyStore(), {
      id: 'reading',
      name: '阅读',
      targetPerDay: 1,
      today: '2026-07-20'
    })
    const archived = archiveHabit(created, 'reading', '2026-07-24')

    expect(isHabitActiveOn(archived.habits[0], '2026-07-24')).toBe(true)
    expect(isHabitActiveOn(archived.habits[0], '2026-07-25')).toBe(false)
  })

  it('updates one completion record within zero and target', () => {
    const created = createHabit(emptyStore(), {
      id: 'english',
      name: '英语',
      targetPerDay: 2,
      today: '2026-07-24'
    })
    const once = adjustCompletion(created, 'english', '2026-07-24', 1, '2026-07-24')
    const capped = adjustCompletion(once, 'english', '2026-07-24', 4, '2026-07-24')
    const removed = adjustCompletion(capped, 'english', '2026-07-24', -2, '2026-07-24')

    expect(once.completions).toEqual([{ habitId: 'english', date: '2026-07-24', count: 1 }])
    expect(capped.completions[0].count).toBe(2)
    expect(removed.completions).toEqual([])
  })

  it('rejects future dates and dates outside the recent seven-day correction window', () => {
    const created = createHabit(emptyStore(), {
      id: 'reading',
      name: '阅读',
      targetPerDay: 1,
      today: '2026-07-01'
    })

    expect(() =>
      adjustCompletion(created, 'reading', '2026-07-17', 1, '2026-07-24')
    ).toThrow('仅可修正最近 7 天')
    expect(() =>
      adjustCompletion(created, 'reading', '2026-07-25', 1, '2026-07-24')
    ).toThrow('仅可修正最近 7 天')
  })

  it('locks the target after creation day or once any record exists', () => {
    const created = createHabit(emptyStore(), {
      id: 'english',
      name: '英语',
      targetPerDay: 2,
      today: '2026-07-24'
    })

    expect(() =>
      editHabit(created, 'english', { name: '英语听力', targetPerDay: 3 }, '2026-07-25')
    ).toThrow('每日目标已锁定')

    const recorded = adjustCompletion(created, 'english', '2026-07-24', 1, '2026-07-24')
    expect(() =>
      editHabit(recorded, 'english', { name: '英语听力', targetPerDay: 3 }, '2026-07-24')
    ).toThrow('每日目标已锁定')
  })
})

describe('store validation', () => {
  it('rejects duplicate ids, orphan completions and invalid counts', () => {
    const duplicate: Store = {
      version: 1,
      habits: [
        { id: 'same', name: '阅读', targetPerDay: 1, createdOn: '2026-07-20', archivedOn: null },
        { id: 'same', name: '运动', targetPerDay: 1, createdOn: '2026-07-20', archivedOn: null }
      ],
      completions: []
    }
    expect(validateStore(duplicate).ok).toBe(false)

    const orphan: Store = {
      version: 1,
      habits: [],
      completions: [{ habitId: 'missing', date: '2026-07-24', count: 1 }]
    }
    expect(validateStore(orphan).ok).toBe(false)
  })
})
