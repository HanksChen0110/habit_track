import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '../../src/data/supabaseClient'
import { SupabaseStoreRepository } from '../../src/data/supabaseRepository'

vi.mock('../../src/data/supabaseClient', () => ({
  getSupabaseClient: vi.fn()
}))

interface QueryCall {
  table: string
  columns: string | undefined
  orders: Array<{ column: string; ascending: boolean | undefined }>
  range: [number, number] | undefined
  limit: number | undefined
}

interface QueryError {
  code: string
  details: string
  hint: string
  message: string
}

interface QueryResponse {
  data: unknown
  error: QueryError | null
  count: null
  status: number
  statusText: string
}

type QueryResolver = (call: QueryCall) => QueryResponse

class FakeQueryBuilder implements PromiseLike<QueryResponse> {
  constructor(
    private readonly call: QueryCall,
    private readonly resolveQuery: QueryResolver
  ) {}

  select(columns?: string): this {
    this.call.columns = columns
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.call.orders.push({ column, ascending: options?.ascending })
    return this
  }

  range(from: number, to: number): this {
    this.call.range = [from, to]
    return this
  }

  limit(rows: number): this {
    this.call.limit = rows
    return this
  }

  then<TResult1 = QueryResponse, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolveQuery(this.call)).then(onfulfilled, onrejected)
  }
}

function success(data: unknown): QueryResponse {
  return { data, error: null, count: null, status: 200, statusText: 'OK' }
}

function failure(code: string, message: string): QueryResponse {
  return {
    data: null,
    error: { code, details: '', hint: '', message },
    count: null,
    status: 500,
    statusText: 'Internal Server Error'
  }
}

function createClient(resolveQuery: QueryResolver): {
  client: SupabaseClient
  calls: QueryCall[]
} {
  const calls: QueryCall[] = []
  const client = {
    from(table: string) {
      const call: QueryCall = {
        table,
        columns: undefined,
        orders: [],
        range: undefined,
        limit: undefined
      }
      calls.push(call)
      return new FakeQueryBuilder(call, resolveQuery)
    }
  } as unknown as SupabaseClient

  return { client, calls }
}

function completionDate(index: number): string {
  return new Date(Date.UTC(2010, 0, index + 1)).toISOString().slice(0, 10)
}

const initializedRow = { initialized_at: '2026-07-31T00:00:00Z' }
const habitRow = {
  id: 'walk',
  name: 'Walk',
  target_per_day: 1,
  created_on: '2010-01-01',
  archived_on: null
}

beforeEach(() => {
  vi.mocked(getSupabaseClient).mockReset()
})

describe('SupabaseStoreRepository.read', () => {
  it('returns null for an account that has not initialized data without reading relation rows', async () => {
    const { client, calls } = createClient((call) => {
      if (call.table === 'user_data_state') return success([])
      throw new Error(`unexpected table read: ${call.table}`)
    })
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().read()).resolves.toBeNull()
    expect(calls).toEqual([
      {
        table: 'user_data_state',
        columns: 'initialized_at',
        orders: [],
        range: undefined,
        limit: 1
      }
    ])
  })

  it('returns a validated empty Store after the account has explicitly initialized empty data', async () => {
    const { client } = createClient((call) => {
      if (call.table === 'user_data_state') return success([initializedRow])
      return success([])
    })
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().read()).resolves.toEqual({
      version: 1,
      habits: [],
      completions: []
    })
  })

  it('reads 3650 completions in four non-overlapping pages ordered by their stable primary key', async () => {
    const completionRows = Array.from({ length: 3650 }, (_, index) => ({
      habit_id: 'walk',
      date: completionDate(index),
      count: 1
    }))
    const { client, calls } = createClient((call) => {
      if (call.table === 'user_data_state') return success([initializedRow])
      if (call.table === 'habits') return success(call.range?.[0] === 0 ? [habitRow] : [])
      if (call.table === 'completions') {
        const [from, to] = call.range ?? [0, -1]
        return success(completionRows.slice(from, to + 1))
      }
      throw new Error(`unexpected table read: ${call.table}`)
    })
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    const store = await new SupabaseStoreRepository().read()

    expect(store?.habits).toEqual([
      {
        id: 'walk',
        name: 'Walk',
        targetPerDay: 1,
        createdOn: '2010-01-01',
        archivedOn: null
      }
    ])
    expect(store?.completions).toHaveLength(3650)
    expect(store?.completions[0]).toEqual({ habitId: 'walk', date: '2010-01-01', count: 1 })
    expect(store?.completions[3649]).toEqual({
      habitId: 'walk',
      date: completionDate(3649),
      count: 1
    })

    expect(calls.filter((call) => call.table === 'habits')).toEqual([
      {
        table: 'habits',
        columns: 'id,name,target_per_day,created_on,archived_on',
        orders: [{ column: 'id', ascending: true }],
        range: [0, 999],
        limit: undefined
      }
    ])
    expect(calls.filter((call) => call.table === 'completions')).toEqual([
      {
        table: 'completions',
        columns: 'habit_id,date,count',
        orders: [
          { column: 'habit_id', ascending: true },
          { column: 'date', ascending: true }
        ],
        range: [0, 999],
        limit: undefined
      },
      {
        table: 'completions',
        columns: 'habit_id,date,count',
        orders: [
          { column: 'habit_id', ascending: true },
          { column: 'date', ascending: true }
        ],
        range: [1000, 1999],
        limit: undefined
      },
      {
        table: 'completions',
        columns: 'habit_id,date,count',
        orders: [
          { column: 'habit_id', ascending: true },
          { column: 'date', ascending: true }
        ],
        range: [2000, 2999],
        limit: undefined
      },
      {
        table: 'completions',
        columns: 'habit_id,date,count',
        orders: [
          { column: 'habit_id', ascending: true },
          { column: 'date', ascending: true }
        ],
        range: [3000, 3999],
        limit: undefined
      }
    ])
  })

  it('rejects the whole read when any completion page fails', async () => {
    const firstTwoPages = Array.from({ length: 2000 }, (_, index) => ({
      habit_id: 'walk',
      date: completionDate(index),
      count: 1
    }))
    const { client, calls } = createClient((call) => {
      if (call.table === 'user_data_state') return success([initializedRow])
      if (call.table === 'habits') return success([habitRow])
      if (call.table === 'completions' && call.range?.[0] === 2000) {
        return failure('READ_PAGE_FAILED', 'completion page failed')
      }
      if (call.table === 'completions') {
        const [from, to] = call.range ?? [0, -1]
        return success(firstTwoPages.slice(from, to + 1))
      }
      throw new Error(`unexpected table read: ${call.table}`)
    })
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().read()).rejects.toMatchObject({
      cause: { code: 'READ_PAGE_FAILED' }
    })
    expect(calls.filter((call) => call.table === 'completions')).toHaveLength(3)
  })

  it.each(['user_data_state', 'habits'])(
    'rejects instead of treating a failed %s query as empty data',
    async (failedTable) => {
      const { client } = createClient((call) => {
        if (call.table === failedTable) return failure('QUERY_FAILED', `${failedTable} failed`)
        if (call.table === 'user_data_state') return success([initializedRow])
        return success([])
      })
      vi.mocked(getSupabaseClient).mockReturnValue(client)

      await expect(new SupabaseStoreRepository().read()).rejects.toMatchObject({
        cause: { code: 'QUERY_FAILED' }
      })
    }
  )

  it('rejects server rows that cannot form a valid Store', async () => {
    const { client } = createClient((call) => {
      if (call.table === 'user_data_state') return success([initializedRow])
      if (call.table === 'habits') return success([habitRow])
      if (call.table === 'completions') {
        return success([{ habit_id: 'walk', date: '2010-01-01', count: 2 }])
      }
      throw new Error(`unexpected table read: ${call.table}`)
    })
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().read()).rejects.toThrow(
      '完成记录次数无效：walk:2010-01-01'
    )
  })

  it('rejects a successful response without an array payload', async () => {
    const { client } = createClient((call) => {
      if (call.table === 'user_data_state') return success(null)
      throw new Error(`unexpected table read: ${call.table}`)
    })
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().read()).rejects.toThrow(
      'user_data_state returned an invalid payload'
    )
  })
})
