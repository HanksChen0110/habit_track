import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { addDays } from '../../src/domain/dates'
import type { Completion, Store } from '../../src/domain/types'

const appStoreMock = vi.hoisted(() => ({
  initialStore: null as Store | null,
  publish: null as ((store: Store | null) => void) | null
}))

const authMock = vi.hoisted(() => ({
  signOut: vi.fn()
}))

vi.mock('../../src/auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'user-1', email: 'me@example.com' },
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: authMock.signOut
  })
}))

vi.mock('../../src/app/AppStore', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  interface AppStoreValue {
    status: 'ready'
    store: Store | null
    today: string
    notice: string
    error: string
    beginEmpty: () => Promise<boolean>
    beginDemo: () => Promise<boolean>
    commit: (buildNext: (current: Store) => Store) => Promise<boolean>
    previewImport: () => never
    confirmImport: () => Promise<boolean>
    exportJson: () => string
    reload: () => Promise<boolean>
    clearMessages: () => void
  }

  const Context = React.createContext<AppStoreValue | null>(null)

  function AppStoreProvider({ children }: { children: ReactNode }) {
    const [store, setStore] = React.useState<Store | null>(() =>
      appStoreMock.initialStore === null
        ? null
        : structuredClone(appStoreMock.initialStore)
    )

    React.useEffect(() => {
      appStoreMock.publish = (next) =>
        setStore(next === null ? null : structuredClone(next))
      return () => {
        appStoreMock.publish = null
      }
    }, [])

    const value = React.useMemo<AppStoreValue>(
      () => ({
        status: 'ready',
        store,
        today: '2026-07-25',
        notice: '',
        error: '',
        beginEmpty: async () => {
          setStore({ version: 1, habits: [], completions: [] })
          return true
        },
        beginDemo: async () => false,
        commit: async (buildNext) => {
          if (!store) return false
          setStore(buildNext(structuredClone(store)))
          return true
        },
        previewImport: () => {
          throw new Error('not used by insights tests')
        },
        confirmImport: async () => false,
        exportJson: () => JSON.stringify(store),
        reload: async () => true,
        clearMessages: () => undefined
      }),
      [store]
    )

    return <Context.Provider value={value}>{children}</Context.Provider>
  }

  function useAppStore() {
    const value = React.useContext(Context)
    if (!value) throw new Error('missing test AppStoreProvider')
    return value
  }

  return { AppStoreProvider, useAppStore }
})

function seedInsightStore() {
  const completions: Completion[] = []
  for (let offset = -60; offset <= -1; offset += 1) {
    const date = addDays('2026-07-25', offset)
    if (offset % 5 !== 0) completions.push({ habitId: 'read', date, count: 1 })
    if (offset % 4 !== 0) completions.push({ habitId: 'move', date, count: 1 })
  }
  const store: Store = {
    version: 1,
    habits: [
      { id: 'read', name: '阅读', targetPerDay: 1, createdOn: '2026-05-26', archivedOn: null },
      { id: 'move', name: '运动', targetPerDay: 1, createdOn: '2026-05-26', archivedOn: null }
    ],
    completions
  }
  appStoreMock.initialStore = store
  window.location.hash = '#/insights'
}

describe('洞察页入口', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T12:00:00'))
    localStorage.clear()
    window.location.hash = '#/today'
    appStoreMock.initialStore = null
    appStoreMock.publish = null
    authMock.signOut.mockReset().mockResolvedValue({ ok: true })
  })

  it('adds insights beside today, week and manage', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '开始记录' }))

    const insightLinks = screen.getAllByRole('link', { name: '洞察' })
    expect(insightLinks.length).toBeGreaterThan(0)
    fireEvent.click(insightLinks[0])
    expect(screen.getByRole('heading', { name: '看见习惯如何一起变化' })).toBeInTheDocument()
    expect(screen.getByText('创建第一个习惯后，这里会开始积累趋势')).toBeInTheDocument()
  })

  it('defaults to 30 days and changes the trend range without persisting it', () => {
    seedInsightStore()
    localStorage.setItem('xunji.store.v1', 'legacy-range-sentinel')
    const before = localStorage.getItem('xunji.store.v1')
    render(<App />)

    expect(screen.getByRole('button', { name: '30 天' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/截至 7月24日/)).toBeInTheDocument()
    expect(screen.getByText('整体执行率')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '7 天' }))
    expect(screen.getByRole('button', { name: '7 天' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('insight-trend-chart')).toHaveAttribute('data-range', '7')
    expect(localStorage.getItem('xunji.store.v1')).toBe(before)
  })

  it('keeps insight states textual and announces range changes', () => {
    seedInsightStore()
    render(<App />)

    expect(screen.getAllByText(/上升|稳定|下降|暂无可比数据/).length).toBeGreaterThan(0)
    expect(screen.getByText(/数据积累中|初步线索|共同有效日期/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '洞察时间范围' })).toBeInTheDocument()
    const matrix = screen.getByRole('table', { name: '习惯共现矩阵' })
    const scrollContainer = matrix.closest('.cooccurrence-scroll')
    expect(scrollContainer).toBeInTheDocument()
    expect(scrollContainer).not.toContainElement(screen.getByRole('button', { name: '同时达标' }))
    expect(screen.getByRole('status')).toHaveTextContent(/已切换到 30 天洞察/)

    fireEvent.click(screen.getByRole('button', { name: '7 天' }))
    expect(screen.getByRole('status')).toHaveTextContent(/已切换到 7 天洞察/)
  })

  it('labels the leading co-occurrence with its readable rankable sample level', () => {
    seedInsightStore()
    render(<App />)

    expect(screen.getByRole('region', { name: '本期线索' })).toHaveTextContent('可排序样本（≥14 天）')
    expect(screen.getByRole('region', { name: '本期线索' })).toHaveTextContent('伴随关系不代表因果')
  })

  it('keeps date points discoverable instead of hiding them in an image role', () => {
    seedInsightStore()
    render(<App />)

    const chart = screen.getByTestId('insight-trend-chart')
    expect(chart.querySelector('svg')).not.toHaveAttribute('role', 'img')
    expect(screen.getAllByRole('button', { name: /整体执行率/ }).length).toBeGreaterThan(0)
    expect(screen.getByText(/执行率趋势，纵轴固定为 0 到 100%/)).toBeInTheDocument()
  })

  it('opens drill-down details and keeps the selected range after closing', () => {
    seedInsightStore()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '30 天' }))
    fireEvent.click(screen.getByRole('button', { name: /阅读与运动，同时达标/ }))
    const pairDetail = screen.getByRole('dialog', { name: /阅读与运动/ })
    expect(pairDetail).toHaveTextContent('伴随关系不代表因果')
    expect(pairDetail).toHaveTextContent('共同有效日期')

    fireEvent.click(screen.getByRole('button', { name: '7 天' }))
    expect(pairDetail).toHaveTextContent('共同有效日期：7 天。')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7 天' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /查看阅读的趋势/ }))
    const habitDetail = screen.getByRole('dialog', { name: /阅读/ })
    const manageLink = within(habitDetail).getByRole('link', { name: '前往管理' })
    expect(manageLink).toHaveAttribute('href', '#/manage?habit=read')
    fireEvent.click(manageLink)
    expect(window.location.hash).toBe('#/manage?habit=read')
    expect(screen.getByTestId('focused-manage-habit')).toHaveTextContent('阅读')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('drills a ninety-day weekly point into that point’s full date range and weekly totals', () => {
    seedInsightStore()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '90 天' }))
    fireEvent.click(screen.getByRole('button', { name: /2026-07-20，整体执行率/ }))

    const detail = screen.getByRole('dialog', { name: '2026-07-20 至 2026-07-24 详情' })
    expect(detail).toHaveTextContent('该范围有效习惯的目标量和完成量。')
    expect(detail).toHaveTextContent('整体8 / 10（80%）')
    expect(detail).toHaveTextContent('阅读：4 / 5')
    expect(detail).toHaveTextContent('运动：4 / 5')
  })

  it('closes selected habit and pair details when an external update archives a referenced habit', () => {
    seedInsightStore()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /查看阅读的趋势/ }))
    expect(screen.getByRole('dialog', { name: '阅读' })).toBeInTheDocument()

    const archivedStore = structuredClone(appStoreMock.initialStore!)
    archivedStore.habits[0].archivedOn = '2026-07-24'
    act(() => appStoreMock.publish!(archivedStore))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    archivedStore.habits[0].archivedOn = null
    act(() => appStoreMock.publish!(archivedStore))
    fireEvent.click(screen.getByRole('button', { name: /阅读与运动，同时达标/ }))
    expect(screen.getByRole('dialog', { name: /阅读与运动/ })).toBeInTheDocument()

    const pairArchivedStore = structuredClone(archivedStore)
    pairArchivedStore.habits[1].archivedOn = '2026-07-24'
    act(() => appStoreMock.publish!(pairArchivedStore))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a stable empty state until a first full record day exists', () => {
    const store: Store = {
      version: 1,
      habits: [{ id: 'new', name: '新习惯', targetPerDay: 1, createdOn: '2026-07-25', archivedOn: null }],
      completions: [{ habitId: 'new', date: '2026-07-25', count: 1 }]
    }
    appStoreMock.initialStore = store
    window.location.hash = '#/insights'

    render(<App />)

    expect(screen.getByText('完成第一个完整记录日后生成洞察')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('switches co-occurrence views and ranks habits without overstating small samples', () => {
    const shortStore: Store = {
      version: 1,
      habits: [
        { id: 'read', name: '阅读', targetPerDay: 1, createdOn: '2026-07-21', archivedOn: null },
        { id: 'move', name: '运动', targetPerDay: 1, createdOn: '2026-07-21', archivedOn: null }
      ],
      completions: []
    }
    appStoreMock.initialStore = shortStore
    window.location.hash = '#/insights'
    render(<App />)

    expect(screen.getByRole('button', { name: '同时达标' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('table', { name: '习惯共现矩阵' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '同时未达标' }))
    expect(screen.getByRole('button', { name: '同时未达标' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /阅读与运动，同时未达标/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '按执行率排序' }))
    expect(screen.getByRole('button', { name: '按执行率排序' })).toHaveAttribute('aria-pressed', 'true')

    expect(screen.getByRole('button', { name: /阅读与运动，同时未达标，积累中/ })).toBeInTheDocument()
    expect(screen.getByText('积累中')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /阅读与运动，同时未达标，\d+%/ })).not.toBeInTheDocument()
  })
})
