import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '../../src/data/supabaseClient'
import { SupabaseStoreRepository } from '../../src/data/supabaseRepository'

vi.mock('../../src/data/supabaseClient', () => ({
  getSupabaseClient: vi.fn()
}))

interface QueryResponse {
  data: unknown
  error: unknown
}

class QueryBuilder implements PromiseLike<QueryResponse> {
  constructor(private readonly response: QueryResponse) {}

  select(): this {
    return this
  }

  order(): this {
    return this
  }

  range(): this {
    return this
  }

  limit(): this {
    return this
  }

  then<TResult1 = QueryResponse, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected)
  }
}

describe('SupabaseStoreRepository error classification', () => {
  beforeEach(() => {
    vi.mocked(getSupabaseClient).mockReset()
  })

  it('classifies server rows that cannot form a valid Store as an integrity failure', async () => {
    const client = {
      from(table: string) {
        const data =
          table === 'user_data_state'
            ? [{ initialized_at: '2026-08-01T00:00:00Z' }]
            : table === 'habits'
              ? [{
                  id: 'walk',
                  name: 'Walk',
                  target_per_day: 1,
                  created_on: '2026-08-01',
                  archived_on: null
                }]
              : [{ habit_id: 'walk', date: '2026-08-01', count: 2 }]
        return new QueryBuilder({ data, error: null })
      }
    }
    vi.mocked(getSupabaseClient).mockReturnValue(client as never)

    await expect(new SupabaseStoreRepository().read()).rejects.toMatchObject({
      name: 'StoreIntegrityError',
      message: '完成记录次数无效：walk:2026-08-01'
    })
  })
})
