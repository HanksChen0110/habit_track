import { validateStore } from '../domain/store'
import type { Completion, Habit, Store } from '../domain/types'
import { StoreIntegrityError, type StoreRepository } from './repository'
import { getSupabaseClient } from './supabaseClient'

const PAGE_SIZE = 1000

interface HabitRow {
  id: string
  name: string
  target_per_day: number
  created_on: string
  archived_on: string | null
}

interface CompletionRow {
  habit_id: string
  date: string
  count: number
}

interface QueryResult<T> {
  data: T[] | null
  error: unknown
}

interface WriteResult {
  error: unknown
}

interface RecordChange<T> {
  previous?: T
  candidate?: T
}

function requireRows<T>(source: string, result: QueryResult<T>): T[] {
  if (result.error) {
    throw new Error(`${source} read failed`, { cause: result.error })
  }
  if (!Array.isArray(result.data)) {
    throw new Error(`${source} returned an invalid payload`)
  }
  return result.data
}

async function readAllPages<T>(
  source: string,
  readPage: (from: number, to: number) => PromiseLike<QueryResult<T>>
): Promise<T[]> {
  const rows: T[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const page = requireRows(source, await readPage(from, from + PAGE_SIZE - 1))
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

function requireValidCandidate(candidate: Store): Store {
  const validation = validateStore(candidate)
  if (!validation.ok) throw new Error(validation.errors.join('；'))
  return structuredClone(candidate)
}

function requireWrite(source: string, result: WriteResult): void {
  if (result.error) {
    throw new Error(`${source} write failed`, { cause: result.error })
  }
}

function habitEquals(left: Habit, right: Habit): boolean {
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.targetPerDay === right.targetPerDay &&
    left.createdOn === right.createdOn &&
    left.archivedOn === right.archivedOn
  )
}

function completionKey(completion: Completion): string {
  return JSON.stringify([completion.habitId, completion.date])
}

function completionEquals(left: Completion, right: Completion): boolean {
  return (
    left.habitId === right.habitId &&
    left.date === right.date &&
    left.count === right.count
  )
}

function collectChanges<T>(
  previousRecords: T[],
  candidateRecords: T[],
  keyOf: (record: T) => string,
  equals: (left: T, right: T) => boolean
): RecordChange<T>[] {
  const previousByKey = new Map(previousRecords.map((record) => [keyOf(record), record]))
  const candidateByKey = new Map(candidateRecords.map((record) => [keyOf(record), record]))
  const keys = new Set([...previousByKey.keys(), ...candidateByKey.keys()])
  const changes: RecordChange<T>[] = []

  for (const key of keys) {
    const previous = previousByKey.get(key)
    const candidate = candidateByKey.get(key)
    if (!previous || !candidate || !equals(previous, candidate)) {
      changes.push({ previous, candidate })
    }
  }

  return changes
}

function collectStoreChanges(previous: Store, candidate: Store): {
  habitChanges: RecordChange<Habit>[]
  completionChanges: RecordChange<Completion>[]
} {
  return {
    habitChanges: collectChanges(
      previous.habits,
      candidate.habits,
      (habit) => habit.id,
      habitEquals
    ),
    completionChanges: collectChanges(
      previous.completions,
      candidate.completions,
      completionKey,
      completionEquals
    )
  }
}

function toHabitRow(habit: Habit): HabitRow {
  return {
    id: habit.id,
    name: habit.name,
    target_per_day: habit.targetPerDay,
    created_on: habit.createdOn,
    archived_on: habit.archivedOn
  }
}

function toCompletionRow(completion: Completion): CompletionRow {
  return {
    habit_id: completion.habitId,
    date: completion.date,
    count: completion.count
  }
}

export class SupabaseStoreRepository
  implements Pick<StoreRepository, 'read' | 'commit' | 'replace'>
{
  async read(): Promise<Store | null> {
    const client = getSupabaseClient()
    const stateRows = requireRows(
      'user_data_state',
      await client.from('user_data_state').select('initialized_at').limit(1)
    )

    if (stateRows.length === 0) return null

    const habitRows = await readAllPages<HabitRow>('habits', (from, to) =>
      client
        .from('habits')
        .select('id,name,target_per_day,created_on,archived_on')
        .order('id', { ascending: true })
        .range(from, to)
    )
    const completionRows = await readAllPages<CompletionRow>('completions', (from, to) =>
      client
        .from('completions')
        .select('habit_id,date,count')
        .order('habit_id', { ascending: true })
        .order('date', { ascending: true })
        .range(from, to)
    )

    const store: Store = {
      version: 1,
      habits: habitRows.map((row) => ({
        id: row.id,
        name: row.name,
        targetPerDay: row.target_per_day,
        createdOn: row.created_on,
        archivedOn: row.archived_on
      })),
      completions: completionRows.map((row) => ({
        habitId: row.habit_id,
        date: row.date,
        count: row.count
      }))
    }
    const validation = validateStore(store)
    if (!validation.ok) throw new StoreIntegrityError(validation.errors.join('；'))

    return store
  }

  async commit(previous: Store, candidate: Store): Promise<Store> {
    const validCandidate = requireValidCandidate(candidate)
    const { habitChanges, completionChanges } = collectStoreChanges(previous, validCandidate)

    if (habitChanges.length + completionChanges.length !== 1) {
      throw new Error('commit requires exactly one supported record change')
    }

    if (habitChanges.length === 1) {
      const change = habitChanges[0]
      if (!change.candidate) {
        throw new Error('commit requires exactly one supported record change')
      }
      const client = getSupabaseClient()
      requireWrite(
        'habits',
        await client
          .from('habits')
          .upsert(toHabitRow(change.candidate), { defaultToNull: false })
      )
      return validCandidate
    }

    const change = completionChanges[0]
    const client = getSupabaseClient()
    if (change.candidate) {
      requireWrite(
        'completions',
        await client
          .from('completions')
          .upsert(toCompletionRow(change.candidate), { defaultToNull: false })
      )
      return validCandidate
    }

    const removed = change.previous
    if (!removed) throw new Error('commit requires exactly one supported record change')
    requireWrite(
      'completions',
      await client
        .from('completions')
        .delete()
        .eq('habit_id', removed.habitId)
        .eq('date', removed.date)
    )
    return validCandidate
  }

  async replace(candidate: Store): Promise<Store> {
    const validCandidate = requireValidCandidate(candidate)
    const client = getSupabaseClient()
    requireWrite(
      'replace_user_store',
      await client.rpc('replace_user_store', { candidate: validCandidate })
    )

    const readback = await this.read()
    if (readback === null) throw new Error('replace readback returned uninitialized data')
    return readback
  }
}
