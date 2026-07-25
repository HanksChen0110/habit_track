import type { DateKey } from './types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseLocalDate(value: DateKey): Date {
  if (!DATE_PATTERN.test(value)) {
    throw new Error('日期格式无效')
  }
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error('日期无效')
  }
  return date
}

export function formatLocalDate(date: Date): DateKey {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string') return false
  try {
    parseLocalDate(value)
    return true
  } catch {
    return false
  }
}

export function addDays(value: DateKey, amount: number): DateKey {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + amount)
  return formatLocalDate(date)
}

export function getWeekStart(value: DateKey): DateKey {
  const date = parseLocalDate(value)
  const day = date.getDay()
  const distanceFromMonday = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - distanceFromMonday)
  return formatLocalDate(date)
}

export function getWeekDates(weekStart: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

export function recentSevenDays(today: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6))
}

export function compareDateKeys(left: DateKey, right: DateKey): number {
  return left.localeCompare(right)
}

export function isBetweenInclusive(value: DateKey, start: DateKey, end: DateKey): boolean {
  return compareDateKeys(value, start) >= 0 && compareDateKeys(value, end) <= 0
}
