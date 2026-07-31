import { validateStore } from '../domain/store'
import type { Store } from '../domain/types'
import type { StoreRepository } from './repository'
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

export class SupabaseStoreRepository implements Pick<StoreRepository, 'read'> {
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
    if (!validation.ok) throw new Error(validation.errors.join('；'))

    return store
  }
}
