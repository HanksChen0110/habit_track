import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatLocalDate,
  getWeekDates,
  getWeekStart,
  recentSevenDays
} from '../../src/domain/dates'

describe('local calendar dates', () => {
  it('formats dates without converting through UTC', () => {
    expect(formatLocalDate(new Date(2026, 6, 24, 23, 30))).toBe('2026-07-24')
  })

  it('finds a Monday-first natural week', () => {
    expect(getWeekStart('2026-07-24')).toBe('2026-07-20')
    expect(getWeekDates('2026-07-20')).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26'
    ])
  })

  it('defines recent seven days as today minus six through today', () => {
    expect(recentSevenDays('2026-07-24')).toEqual([
      '2026-07-18',
      '2026-07-19',
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24'
    ])
    expect(addDays('2026-07-24', -6)).toBe('2026-07-18')
  })
})
