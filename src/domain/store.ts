import { addDays, compareDateKeys, formatLocalDate, isValidDateKey } from './dates'
import type { Habit, Store, ValidationResult } from './types'

export interface CreateHabitInput {
  id: string
  name: string
  targetPerDay: number
  today: string
}

export function emptyStore(): Store {
  return { version: 1, habits: [], completions: [] }
}

export function isHabitActiveOn(habit: Habit, date: string): boolean {
  return (
    compareDateKeys(date, habit.createdOn) >= 0 &&
    (habit.archivedOn === null || compareDateKeys(date, habit.archivedOn) <= 0)
  )
}

function requireName(name: string): string {
  const normalized = name.trim()
  if (!normalized) throw new Error('请输入习惯名称')
  return normalized
}

function requireTarget(target: number): number {
  if (!Number.isInteger(target) || target < 1) {
    throw new Error('每日目标必须是大于 0 的整数')
  }
  return target
}

function requireValidStore(store: Store): Store {
  const result = validateStore(store)
  if (!result.ok) throw new Error(result.errors[0])
  return store
}

export function createHabit(store: Store, input: CreateHabitInput): Store {
  if (!input.id.trim() || store.habits.some((habit) => habit.id === input.id)) {
    throw new Error('习惯标识无效或已存在')
  }
  if (!isValidDateKey(input.today)) throw new Error('创建日期无效')

  return requireValidStore({
    ...store,
    habits: [
      ...store.habits,
      {
        id: input.id,
        name: requireName(input.name),
        targetPerDay: requireTarget(input.targetPerDay),
        createdOn: input.today,
        archivedOn: null
      }
    ]
  })
}

export function editHabit(
  store: Store,
  habitId: string,
  changes: { name: string; targetPerDay: number },
  today: string
): Store {
  const habit = store.habits.find((item) => item.id === habitId)
  if (!habit) throw new Error('习惯不存在')

  const targetChanged = changes.targetPerDay !== habit.targetPerDay
  const hasRecord = store.completions.some((item) => item.habitId === habitId)
  if (targetChanged && (habit.createdOn !== today || hasRecord)) {
    throw new Error('每日目标已锁定')
  }

  return requireValidStore({
    ...store,
    habits: store.habits.map((item) =>
      item.id === habitId
        ? {
            ...item,
            name: requireName(changes.name),
            targetPerDay: requireTarget(changes.targetPerDay)
          }
        : item
    )
  })
}

export function archiveHabit(store: Store, habitId: string, today: string): Store {
  const habit = store.habits.find((item) => item.id === habitId)
  if (!habit) throw new Error('习惯不存在')
  if (!isValidDateKey(today) || compareDateKeys(today, habit.createdOn) < 0) {
    throw new Error('归档日期无效')
  }

  return requireValidStore({
    ...store,
    habits: store.habits.map((item) =>
      item.id === habitId ? { ...item, archivedOn: today } : item
    )
  })
}

export function adjustCompletion(
  store: Store,
  habitId: string,
  date: string,
  delta: number,
  today: string
): Store {
  const habit = store.habits.find((item) => item.id === habitId)
  if (!habit) throw new Error('习惯不存在')
  if (
    !isValidDateKey(today) ||
    !isValidDateKey(date) ||
    compareDateKeys(date, addDays(today, -6)) < 0 ||
    compareDateKeys(date, today) > 0
  ) {
    throw new Error('仅可修正最近 7 天')
  }
  if (!isHabitActiveOn(habit, date)) throw new Error('该日期不可记录')

  const existing = store.completions.find(
    (item) => item.habitId === habitId && item.date === date
  )
  const nextCount = Math.max(0, Math.min(habit.targetPerDay, (existing?.count ?? 0) + delta))
  const withoutExisting = store.completions.filter(
    (item) => !(item.habitId === habitId && item.date === date)
  )

  return requireValidStore({
    ...store,
    completions:
      nextCount === 0
        ? withoutExisting
        : [...withoutExisting, { habitId, date, count: nextCount }]
  })
}

export function validateStore(value: unknown, today = formatLocalDate(new Date())): ValidationResult {
  const errors: string[] = []
  if (typeof value !== 'object' || value === null) {
    return { ok: false, errors: ['数据必须是对象'] }
  }

  const candidate = value as Partial<Store>
  const storeKeys = Object.keys(candidate)
  if (storeKeys.some((key) => !['version', 'habits', 'completions'].includes(key))) {
    errors.push('Store 包含未知字段')
  }
  if (candidate.version !== 1) errors.push('仅支持 Store 版本 1')
  if (!Array.isArray(candidate.habits)) errors.push('habits 必须是数组')
  if (!Array.isArray(candidate.completions)) errors.push('completions 必须是数组')
  if (errors.length > 0) return { ok: false, errors }

  const habits = candidate.habits as Store['habits']
  const completions = candidate.completions as Store['completions']
  const ids = new Set<string>()

  for (const habit of habits) {
    if (
      typeof habit !== 'object' ||
      habit === null ||
      typeof habit.id !== 'string' ||
      !habit.id.trim()
    ) {
      errors.push('习惯 id 必须是非空字符串')
      continue
    }
    if (
      Object.keys(habit).some(
        (key) => !['id', 'name', 'targetPerDay', 'createdOn', 'archivedOn'].includes(key)
      )
    ) {
      errors.push(`习惯 ${habit.id} 包含未知字段`)
    }
    if (ids.has(habit.id)) errors.push(`习惯 id 重复：${habit.id}`)
    ids.add(habit.id)
    if (typeof habit.name !== 'string' || !habit.name.trim()) errors.push('习惯名称不能为空')
    if (!Number.isInteger(habit.targetPerDay) || habit.targetPerDay < 1) {
      errors.push(`习惯 ${habit.id} 的每日目标无效`)
    }
    if (!isValidDateKey(habit.createdOn) || compareDateKeys(habit.createdOn, today) > 0) {
      errors.push(`习惯 ${habit.id} 的创建日期无效`)
    }
    if (
      habit.archivedOn !== null &&
      (!isValidDateKey(habit.archivedOn) ||
        compareDateKeys(habit.archivedOn, habit.createdOn) < 0 ||
        compareDateKeys(habit.archivedOn, today) > 0)
    ) {
      errors.push(`习惯 ${habit.id} 的归档日期无效`)
    }
  }

  const recordKeys = new Set<string>()
  for (const completion of completions) {
    if (typeof completion !== 'object' || completion === null) {
      errors.push('完成记录格式无效')
      continue
    }
    if (
      Object.keys(completion).some(
        (key) => !['habitId', 'date', 'count'].includes(key)
      )
    ) {
      errors.push('完成记录包含未知字段')
    }
    const habit = habits.find((item) => item.id === completion.habitId)
    if (!habit) {
      errors.push(`完成记录引用不存在的习惯：${completion.habitId}`)
      continue
    }
    const recordKey = `${completion.habitId}:${completion.date}`
    if (recordKeys.has(recordKey)) errors.push(`完成记录重复：${recordKey}`)
    recordKeys.add(recordKey)
    if (
      !isValidDateKey(completion.date) ||
      compareDateKeys(completion.date, today) > 0 ||
      !isHabitActiveOn(habit, completion.date)
    ) {
      errors.push(`完成记录日期无效：${recordKey}`)
    }
    if (
      !Number.isInteger(completion.count) ||
      completion.count < 1 ||
      completion.count > habit.targetPerDay
    ) {
      errors.push(`完成记录次数无效：${recordKey}`)
    }
  }

  return { ok: errors.length === 0, errors }
}
