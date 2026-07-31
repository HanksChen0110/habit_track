import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '../../src/data/supabaseClient'
import { SupabaseStoreRepository } from '../../src/data/supabaseRepository'
import type { Store } from '../../src/domain/types'

vi.mock('../../src/data/supabaseClient', () => ({
  getSupabaseClient: vi.fn()
}))

interface DataCall {
  table: string
  operation: 'pending' | 'select' | 'upsert' | 'delete'
  columns?: string
  payload?: unknown
  upsertOptions?: { defaultToNull?: boolean }
  filters: Array<[string, unknown]>
  orders: Array<{ column: string; ascending: boolean | undefined }>
  range?: [number, number]
  limit?: number
}

interface RpcCall {
  functionName: string
  args: unknown
}

interface ApiResponse {
  data: unknown
  error: unknown
}

type DataResolver = (call: DataCall) => ApiResponse
type RpcResolver = (call: RpcCall) => ApiResponse

class FakeDataBuilder implements PromiseLike<ApiResponse> {
  constructor(
    private readonly call: DataCall,
    private readonly resolveData: DataResolver
  ) {}

  select(columns?: string): this {
    this.call.operation = 'select'
    this.call.columns = columns
    return this
  }

  upsert(payload: unknown, options?: { defaultToNull?: boolean }): this {
    this.call.operation = 'upsert'
    this.call.payload = payload
    this.call.upsertOptions = options
    return this
  }

  delete(): this {
    this.call.operation = 'delete'
    return this
  }

  eq(column: string, value: unknown): this {
    this.call.filters.push([column, value])
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

  then<TResult1 = ApiResponse, TResult2 = never>(
    onfulfilled?: ((value: ApiResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolveData(this.call)).then(onfulfilled, onrejected)
  }
}

function success(data: unknown = null): ApiResponse {
  return { data, error: null }
}

function failure(code: string): ApiResponse {
  return { data: null, error: { code, message: code } }
}

function createClient(
  resolveData: DataResolver = () => success(),
  resolveRpc: RpcResolver = () => success()
): { client: SupabaseClient; dataCalls: DataCall[]; rpcCalls: RpcCall[] } {
  const dataCalls: DataCall[] = []
  const rpcCalls: RpcCall[] = []
  const client = {
    from(table: string) {
      const call: DataCall = {
        table,
        operation: 'pending',
        filters: [],
        orders: []
      }
      dataCalls.push(call)
      return new FakeDataBuilder(call, resolveData)
    },
    rpc(functionName: string, args: unknown) {
      const call = { functionName, args }
      rpcCalls.push(call)
      return Promise.resolve(resolveRpc(call))
    }
  } as unknown as SupabaseClient

  return { client, dataCalls, rpcCalls }
}

const previous: Store = {
  version: 1,
  habits: [
    {
      id: 'walk',
      name: 'Walk',
      targetPerDay: 2,
      createdOn: '2026-07-01',
      archivedOn: null
    }
  ],
  completions: [{ habitId: 'walk', date: '2026-07-31', count: 1 }]
}

function cloneStore(store: Store): Store {
  return structuredClone(store)
}

beforeEach(() => {
  vi.mocked(getSupabaseClient).mockReset()
})

describe('SupabaseStoreRepository.commit', () => {
  it.each([
    {
      name: 'adds a Habit',
      candidate: {
        ...previous,
        habits: [
          ...previous.habits,
          {
            id: 'read',
            name: 'Read',
            targetPerDay: 3,
            createdOn: '2026-08-01',
            archivedOn: null
          }
        ]
      } satisfies Store,
      payload: {
        id: 'read',
        name: 'Read',
        target_per_day: 3,
        created_on: '2026-08-01',
        archived_on: null
      }
    },
    {
      name: 'edits one Habit',
      candidate: {
        ...previous,
        habits: [{ ...previous.habits[0], name: 'Morning walk' }]
      } satisfies Store,
      payload: {
        id: 'walk',
        name: 'Morning walk',
        target_per_day: 2,
        created_on: '2026-07-01',
        archived_on: null
      }
    },
    {
      name: 'archives one Habit',
      candidate: {
        ...previous,
        habits: [{ ...previous.habits[0], archivedOn: '2026-08-01' }]
      } satisfies Store,
      payload: {
        id: 'walk',
        name: 'Walk',
        target_per_day: 2,
        created_on: '2026-07-01',
        archived_on: '2026-08-01'
      }
    }
  ])('$name with one habits upsert that omits account ownership', async ({ candidate, payload }) => {
    const { client, dataCalls } = createClient()
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().commit(previous, candidate)).resolves.toEqual(
      candidate
    )
    expect(dataCalls).toEqual([
      {
        table: 'habits',
        operation: 'upsert',
        payload,
        upsertOptions: { defaultToNull: false },
        filters: [],
        orders: []
      }
    ])
    expect(payload).not.toHaveProperty('user_id')
  })

  it.each([
    {
      name: 'inserts',
      completions: [
        ...previous.completions,
        { habitId: 'walk', date: '2026-08-01', count: 1 }
      ],
      payload: { habit_id: 'walk', date: '2026-08-01', count: 1 }
    },
    {
      name: 'updates',
      completions: [{ habitId: 'walk', date: '2026-07-31', count: 2 }],
      payload: { habit_id: 'walk', date: '2026-07-31', count: 2 }
    }
  ])('$name one Completion with one completions upsert', async ({ completions, payload }) => {
    const candidate: Store = { ...previous, completions }
    const { client, dataCalls } = createClient()
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().commit(previous, candidate)).resolves.toEqual(
      candidate
    )
    expect(dataCalls).toEqual([
      {
        table: 'completions',
        operation: 'upsert',
        payload,
        upsertOptions: { defaultToNull: false },
        filters: [],
        orders: []
      }
    ])
    expect(payload).not.toHaveProperty('user_id')
  })

  it('deletes one Completion by its logical key without an account filter', async () => {
    const candidate: Store = { ...previous, completions: [] }
    const { client, dataCalls } = createClient()
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().commit(previous, candidate)).resolves.toEqual(
      candidate
    )
    expect(dataCalls).toEqual([
      {
        table: 'completions',
        operation: 'delete',
        filters: [
          ['habit_id', 'walk'],
          ['date', '2026-07-31']
        ],
        orders: []
      }
    ])
  })

  it.each([
    {
      name: 'a duplicate commit with no logical change',
      previousStore: previous,
      candidate: cloneStore(previous)
    },
    {
      name: 'more than one logical record change',
      previousStore: previous,
      candidate: {
        ...previous,
        habits: [{ ...previous.habits[0], name: 'Morning walk' }],
        completions: [{ ...previous.completions[0], count: 2 }]
      } satisfies Store
    },
    {
      name: 'a removed Habit',
      previousStore: { ...previous, completions: [] } satisfies Store,
      candidate: { ...previous, habits: [], completions: [] } satisfies Store
    }
  ])(
    'rejects $name before opening the Data API',
    async ({ previousStore, candidate }) => {
      const snapshot = cloneStore(previousStore)

      await expect(
        new SupabaseStoreRepository().commit(previousStore, candidate)
      ).rejects.toThrow('exactly one supported record change')
      expect(getSupabaseClient).not.toHaveBeenCalled()
      expect(previousStore).toEqual(snapshot)
    }
  )

  it('validates candidate before opening the Data API', async () => {
    const candidate = {
      ...cloneStore(previous),
      habits: [{ ...previous.habits[0], targetPerDay: 0 }]
    } as Store
    const snapshot = cloneStore(previous)

    await expect(new SupabaseStoreRepository().commit(previous, candidate)).rejects.toThrow(
      '每日目标无效'
    )
    expect(getSupabaseClient).not.toHaveBeenCalled()
    expect(previous).toEqual(snapshot)
  })

  it('rejects a failed record write and leaves previous unchanged', async () => {
    const candidate: Store = {
      ...previous,
      completions: [{ ...previous.completions[0], count: 2 }]
    }
    const snapshot = cloneStore(previous)
    const { client } = createClient(() => failure('WRITE_FAILED'))
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().commit(previous, candidate)).rejects.toMatchObject({
      cause: { code: 'WRITE_FAILED' }
    })
    expect(previous).toEqual(snapshot)
  })
})

describe('SupabaseStoreRepository.replace', () => {
  it('validates candidate before calling the RPC', async () => {
    const candidate = { ...cloneStore(previous), version: 2 } as unknown as Store

    await expect(new SupabaseStoreRepository().replace(candidate)).rejects.toThrow(
      '仅支持 Store 版本 1'
    )
    expect(getSupabaseClient).not.toHaveBeenCalled()
  })

  it('returns the validated server-confirmed Store from replace_user_store without a readback', async () => {
    const candidate = cloneStore(previous)
    const confirmed: Store = {
      ...cloneStore(previous),
      habits: [{ ...previous.habits[0], name: 'Server-confirmed walk' }]
    }
    const { client, dataCalls, rpcCalls } = createClient(
      () => {
        throw new Error('replace must not read after the RPC')
      },
      () => success(confirmed)
    )
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().replace(candidate)).resolves.toEqual(confirmed)
    expect(rpcCalls).toEqual([
      { functionName: 'replace_user_store', args: { candidate } }
    ])
    expect(rpcCalls[0].args).not.toHaveProperty('user_id')
    expect(dataCalls).toEqual([])
  })

  it('rejects an RPC failure without reading back or mutating candidate', async () => {
    const candidate = cloneStore(previous)
    const snapshot = cloneStore(candidate)
    const { client, dataCalls } = createClient(
      () => success(),
      () => failure('RPC_FAILED')
    )
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().replace(candidate)).rejects.toMatchObject({
      cause: { code: 'RPC_FAILED' }
    })
    expect(dataCalls).toEqual([])
    expect(candidate).toEqual(snapshot)
  })

  it('rejects a malformed Store returned by a successful RPC without reading back', async () => {
    const candidate = cloneStore(previous)
    const snapshot = cloneStore(candidate)
    const { client, dataCalls } = createClient(
      () => {
        throw new Error('replace must not read after the RPC')
      },
      () => success({ ...candidate, version: 2 })
    )
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().replace(candidate)).rejects.toThrow(
      '仅支持 Store 版本 1'
    )
    expect(dataCalls).toEqual([])
    expect(candidate).toEqual(snapshot)
  })

  it('rejects a null result from a successful RPC without reading back', async () => {
    const candidate = cloneStore(previous)
    const { client, dataCalls } = createClient(
      () => {
        throw new Error('replace must not read after the RPC')
      },
      () => success(null)
    )
    vi.mocked(getSupabaseClient).mockReturnValue(client)

    await expect(new SupabaseStoreRepository().replace(candidate)).rejects.toThrow()
    expect(dataCalls).toEqual([])
  })
})
