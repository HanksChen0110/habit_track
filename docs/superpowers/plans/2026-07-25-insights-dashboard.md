# “循迹”洞察 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变 Store v1、不引入后端和新 UI 技术体系的前提下，新增可在桌面和手机使用的“洞察”一级页面，提供长期执行趋势、习惯表现和可解释的同日共现分析。

**Architecture:** 先用无副作用领域函数把日期窗口、执行率、趋势、习惯排行和共现结果计算成稳定的 view model，再由 React 页面负责筛选与下钻状态。图表使用原生 SVG/CSS；桌面详情复用可扩展的 Modal 作为右侧 sheet，手机沿用底部面板模式。

**Tech Stack:** React 19、TypeScript、React Router HashRouter、普通 CSS、原生 SVG、Vitest、Testing Library、Playwright、OpenSpec。

---

## 执行约束

- 设计唯一依据：`docs/superpowers/specs/2026-07-25-insights-dashboard-design.md`。
- 保留现有 `Store { version: 1, habits, completions }`，不得添加分类、标签、备注或服务端字段。
- 不安装 Tailwind、shadcn、Recharts、Framer Motion 或新的 Radix 依赖。
- 不改变“今天”“本周”“管理”的现有统计与操作职责。
- 当前仓库有未提交的用户工作；每个任务末尾的提交步骤只有在用户明确授权 Git commit 后执行。不得执行 Git push。
- 执行代码任务前先确保专用工作区不会覆盖当前未提交内容；若继续在当前目录执行，只修改本计划列出的文件。

## 文件结构

### 新建

- `openspec/changes/add-insights-dashboard/.openspec.yaml`：新变更元数据。
- `openspec/changes/add-insights-dashboard/proposal.md`：变更动机、范围和影响。
- `openspec/changes/add-insights-dashboard/design.md`：引用已确认的详细设计。
- `openspec/changes/add-insights-dashboard/specs/long-term-habit-insights/spec.md`：可验收产品规则。
- `openspec/changes/add-insights-dashboard/tasks.md`：与本计划任务对应的规格任务清单。
- `src/domain/insightTypes.ts`：洞察报告、趋势、习惯表现和共现结果类型。
- `src/domain/insights.ts`：观察窗口、执行率、环比、趋势和习惯表现纯函数。
- `src/domain/coOccurrence.ts`：同日共现纯函数。
- `src/pages/InsightsPage.tsx`：页面状态、模块编排和空状态。
- `src/components/InsightRangeTabs.tsx`：7/30/90 天范围选择。
- `src/components/InsightSummaryCards.tsx`：四项总览指标。
- `src/components/InsightTrendChart.tsx`：可访问的 SVG 趋势图。
- `src/components/CoOccurrenceMatrix.tsx`：三视角共现矩阵。
- `src/components/HabitPerformanceList.tsx`：习惯表现排序与选择。
- `src/components/InsightDetailContent.tsx`：KPI、日期、单习惯和习惯对详情内容。
- `tests/domain/insights.test.ts`：长期洞察计算测试。
- `tests/domain/co-occurrence.test.ts`：共现计算和样本门槛测试。
- `tests/ui/InsightsPage.test.tsx`：洞察页面组件交互测试。

### 修改

- `src/App.tsx`：注册 `/insights` 路由。
- `src/components/AppShell.tsx`：桌面和手机导航新增“洞察”。
- `src/components/Modal.tsx`：增加不破坏现有弹窗的 `sheet` 视觉变体。
- `src/pages/ManagePage.tsx`：读取 `habit` 查询参数并聚焦对应习惯。
- `src/data/demo.ts`：把主动载入的示例扩展为可展示 30 天趋势和共现的数据。
- `src/styles.css`：洞察页、SVG、矩阵、sheet 和双端响应式样式。
- `tests/data/demo.test.ts`：验证示例数据足以展示洞察。
- `tests/ui/App.test.tsx`：验证一级导航不破坏原有流程。
- `tests/e2e/app.spec.ts`：增加洞察主流程、下钻、响应式和截图验证。
- `docs/design/high-fidelity-prototype.md`：补充洞察页最终组件与响应式规则。
- `openspec/changes/add-insights-dashboard/tasks.md`：在实现过程中逐项勾选。

## Task 1：建立 OpenSpec 变更基线

**Files:**
- Create: `openspec/changes/add-insights-dashboard/.openspec.yaml`
- Create: `openspec/changes/add-insights-dashboard/proposal.md`
- Create: `openspec/changes/add-insights-dashboard/design.md`
- Create: `openspec/changes/add-insights-dashboard/specs/long-term-habit-insights/spec.md`
- Create: `openspec/changes/add-insights-dashboard/tasks.md`

- [ ] **Step 1: 创建变更元数据**

```yaml
schema: spec-driven
created: 2026-07-25
```

- [ ] **Step 2: 写入 proposal**

```markdown
# 新增长期习惯洞察 Dashboard

## Why

现有产品只能完成每日记录和自然周复盘，无法在更长时间范围观察整体趋势、单习惯变化和习惯之间的同日伴随关系。

## What Changes

- 新增与“今天 / 本周 / 管理”并列的“洞察”一级页面。
- 新增 7、30、90 天的长期执行率、环比和趋势。
- 新增同日共现的三视角分析和样本保护。
- 新增 KPI、日期、单习惯和习惯对的页内下钻。
- 不修改 Store v1，不新增后端或业务字段。

## Impact

- 新增纯前端统计计算和展示组件。
- 手机底部导航由三项调整为四项。
- 主动载入的示例数据延长到 60 个完整日期。
```

- [ ] **Step 3: 写入 delta spec**

`spec.md` 至少逐字包含以下可验证要求和场景：

```markdown
## ADDED Requirements

### Requirement: 提供独立的长期洞察入口
系统 SHALL 提供与“今天”“本周”“管理”并列的“洞察”一级页面，且洞察页不得直接修改习惯名称、每日目标或归档状态。

#### Scenario: 从主导航进入洞察
- **WHEN** 用户在已经初始化的应用中选择“洞察”
- **THEN** 系统 SHALL 进入洞察页并保留其他三个一级入口

### Requirement: 使用已经结束的自然日计算观察窗口
系统 SHALL 以浏览器本地今天的前一日作为洞察截止日，并提供连续 7、30、90 个自然日的观察窗口。

#### Scenario: 今天仍在进行中
- **WHEN** 用户在今天任意时间查看洞察
- **THEN** 系统 SHALL 将今天标记为进行中且不得把今天计入长期趋势或环比

### Requirement: 使用有效习惯日的完成量计算执行率
系统 SHALL 按有效习惯日实际完成量总和除以目标量总和计算整体和单习惯执行率；无 Completion 记录的有效习惯日 SHALL 计为完成量 0。

#### Scenario: 目标大于一且部分完成
- **WHEN** 目标为 2 的习惯在有效日期完成 1 次
- **THEN** 系统 SHALL 计入 1 单位实际完成量和 2 单位目标量

### Requirement: 对比紧邻等长观察窗口
系统 SHALL 仅与当前观察窗口紧邻的上一等长窗口比较并以百分点显示变化；任一窗口没有有效计划时 SHALL 显示暂无可比周期。

#### Scenario: 30 天环比
- **WHEN** 当前和上一连续 30 天均有有效计划
- **THEN** 系统 SHALL 显示两个窗口执行率之差的百分点

### Requirement: 展示可解释的同日共现
系统 SHALL 只比较两项习惯共同有效的日期，将结果拆分为同时达标、同时未达标和表现相反，并明确伴随关系不代表因果。

#### Scenario: 共同有效日期不足
- **WHEN** 两项习惯共同有效日期少于 7 天
- **THEN** 系统 SHALL 显示数据积累中且不得将该习惯对加入共现排序

#### Scenario: 初步线索
- **WHEN** 两项习惯共同有效日期为 7 至 13 天
- **THEN** 系统 SHALL 允许查看结果但标记为初步线索且不得作为首页本期线索

#### Scenario: 可排序线索
- **WHEN** 两项习惯共同有效日期至少为 14 天
- **THEN** 系统 SHALL 允许该习惯对参与本期线索排序并继续显示非因果提示

### Requirement: 支持可访问的页内下钻
系统 SHALL 允许用户从总览指标、趋势点、共现矩阵和习惯表现打开详情，并在关闭后保留时间范围、选中习惯和滚动位置。

#### Scenario: 从习惯详情前往管理
- **WHEN** 用户在习惯详情选择前往管理
- **THEN** 系统 SHALL 打开管理页并聚焦对应习惯，而不得在洞察页直接修改业务规则
```

- [ ] **Step 4: 写入 OpenSpec 设计引用和任务清单**

`design.md` 写明详细设计来源：

```markdown
# Design

实现 SHALL 遵循 `docs/superpowers/specs/2026-07-25-insights-dashboard-design.md`。
数据计算保持 Store v1，图表使用原生 SVG/CSS，不迁移 Tailwind/shadcn。
```

`tasks.md` 写入以下清单：

```markdown
## 1. 领域计算
- [ ] 1.1 实现观察窗口、加权执行率、环比和趋势纯函数及单元测试
- [ ] 1.2 实现同日共现、样本门槛和稳定排序纯函数及单元测试

## 2. 页面与交互
- [ ] 2.1 接入洞察一级导航、路由和空状态
- [ ] 2.2 实现范围切换、总览指标和 SVG 趋势图
- [ ] 2.3 实现共现矩阵、习惯表现和本期线索
- [ ] 2.4 实现页内下钻和管理页定向聚焦

## 3. 双端体验与验证
- [ ] 3.1 完成桌面与手机响应式、无障碍和减少动态效果
- [ ] 3.2 扩展示例数据并完成组件、端到端和目标视口验证
- [ ] 3.3 同步设计文档并通过 OpenSpec 严格校验和完整质量门
```

- [ ] **Step 5: 严格校验新变更**

Run: `openspec validate add-insights-dashboard --strict`

Expected: `add-insights-dashboard` 校验通过，无缺失 requirement 或 scenario。

- [ ] **Step 6: 提交规格检查点（仅在用户授权 commit 后）**

```bash
git add openspec/changes/add-insights-dashboard docs/superpowers/specs/2026-07-25-insights-dashboard-design.md
git commit -m "spec: define long-term habit insights dashboard"
```

## Task 2：实现观察窗口、执行率、环比和趋势纯函数

**Files:**
- Create: `src/domain/insightTypes.ts`
- Create: `src/domain/insights.ts`
- Create: `tests/domain/insights.test.ts`

- [ ] **Step 1: 先写窗口和加权执行率失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { buildInsightReport } from '../../src/domain/insights'
import type { Store } from '../../src/domain/types'

const store: Store = {
  version: 1,
  habits: [
    { id: 'one', name: '每日一次', targetPerDay: 1, createdOn: '2026-06-01', archivedOn: null },
    { id: 'two', name: '每日两次', targetPerDay: 2, createdOn: '2026-06-01', archivedOn: null }
  ],
  completions: [
    { habitId: 'one', date: '2026-07-23', count: 1 },
    { habitId: 'two', date: '2026-07-23', count: 1 },
    { habitId: 'one', date: '2026-07-24', count: 1 },
    { habitId: 'one', date: '2026-07-25', count: 1 }
  ]
}

describe('long-term insight report', () => {
  it('uses yesterday as the end and weights actual units by target units', () => {
    const report = buildInsightReport(store, '2026-07-25', 7)

    expect(report.window.end).toBe('2026-07-24')
    expect(report.window.start).toBe('2026-07-18')
    expect(report.actualTotal).toBe(3)
    expect(report.plannedTotal).toBe(21)
    expect(report.overallRate).toBe(14)
    expect(report.series.some((point) => point.start === '2026-07-25')).toBe(false)
  })

  it('uses the immediately preceding equal window for percentage-point change', () => {
    const report = buildInsightReport(store, '2026-07-25', 7)
    expect(report.window.previousStart).toBe('2026-07-11')
    expect(report.window.previousEnd).toBe('2026-07-17')
    expect(report.previousRate).toBe(0)
    expect(report.deltaPercentagePoints).toBe(14)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:run tests/domain/insights.test.ts`

Expected: FAIL，提示无法解析 `src/domain/insights`。

- [ ] **Step 3: 定义稳定的洞察 view model**

```ts
// src/domain/insightTypes.ts
import type { DateKey } from './types'

export type InsightRange = 7 | 30 | 90
export type TrendDirection = 'up' | 'stable' | 'down' | 'unavailable'

export interface InsightWindow {
  range: InsightRange
  start: DateKey
  end: DateKey
  previousStart: DateKey
  previousEnd: DateKey
}

export interface InsightTrendPoint {
  key: string
  start: DateKey
  end: DateKey
  actual: number
  planned: number
  rate: number | null
  smoothedRate: number | null
}

export interface HabitInsight {
  habitId: string
  name: string
  actual: number
  planned: number
  rate: number | null
  validDays: number
  previousRate: number | null
  deltaPercentagePoints: number | null
  trend: TrendDirection
  qualifiesForHighlights: boolean
}

export interface InsightReport {
  window: InsightWindow
  actualTotal: number
  plannedTotal: number
  overallRate: number | null
  previousRate: number | null
  deltaPercentagePoints: number | null
  plannedDays: number
  series: InsightTrendPoint[]
  habits: HabitInsight[]
  bestHabit: HabitInsight | null
  attentionHabit: HabitInsight | null
}
```

- [ ] **Step 4: 实现日期窗口和统计函数**

`src/domain/insights.ts` 必须导出以下接口：

```ts
export function getInsightWindow(today: DateKey, range: InsightRange): InsightWindow
export function getInsightDates(window: InsightWindow): DateKey[]
export function buildInsightReport(
  store: Store,
  today: DateKey,
  range: InsightRange
): InsightReport
export function buildHabitTrend(
  store: Store,
  today: DateKey,
  range: InsightRange,
  habitId: string
): InsightTrendPoint[]
```

核心实现使用现有日期和生命周期函数：

```ts
const rate = (actual: number, planned: number) =>
  planned === 0 ? null : Math.round((actual / planned) * 100)

export function getInsightWindow(today: DateKey, range: InsightRange): InsightWindow {
  const end = addDays(today, -1)
  const start = addDays(end, 1 - range)
  const previousEnd = addDays(start, -1)
  return {
    range,
    start,
    end,
    previousStart: addDays(previousEnd, 1 - range),
    previousEnd
  }
}

export function getInsightDates(window: InsightWindow): DateKey[] {
  return Array.from({ length: window.range }, (_, index) => addDays(window.start, index))
}
```

每日统计 SHALL：

1. 用 `isHabitActiveOn(habit, date)` 选择有效习惯。
2. 用 `(habitId, date)` 查找 Completion，缺失时计 0。
3. 用 `Math.min(count, targetPerDay)` 计实际量。
4. `planned === 0` 时返回 `rate: null`。

30 天的 `smoothedRate` 使用当前点及前 6 个自然日的实际量总和除以目标量总和；90 天按 `getWeekStart(date)` 聚合；7 天保留每日点且 `smoothedRate` 为 `null`。

习惯趋势映射规则：

```ts
const trendFromDelta = (delta: number | null): TrendDirection => {
  if (delta === null) return 'unavailable'
  if (delta >= 3) return 'up'
  if (delta <= -3) return 'down'
  return 'stable'
}
```

7 天窗口至少 3 个有效计划日、30/90 天窗口至少 7 个有效计划日才把 `qualifiesForHighlights` 设为 `true`。`bestHabit` 从合格项中按 rate 降序选择；`attentionHabit` 优先选择 delta 最低的下降项，否则选择 rate 最低项。

- [ ] **Step 5: 补齐边界测试**

在 `tests/domain/insights.test.ts` 增加：

```ts
it('excludes dates outside habit lifecycle and keeps no-plan days out of the denominator', () => {
  const report = buildInsightReport({
    version: 1,
    habits: [
      { id: 'short', name: '短期', targetPerDay: 1, createdOn: '2026-07-22', archivedOn: '2026-07-23' }
    ],
    completions: [{ habitId: 'short', date: '2026-07-22', count: 1 }]
  }, '2026-07-25', 7)

  expect(report.actualTotal).toBe(1)
  expect(report.plannedTotal).toBe(2)
  expect(report.plannedDays).toBe(2)
})

it('does not promote a one-day habit to best or attention', () => {
  const report = buildInsightReport({
    version: 1,
    habits: [
      { id: 'new', name: '新习惯', targetPerDay: 1, createdOn: '2026-07-24', archivedOn: null }
    ],
    completions: [{ habitId: 'new', date: '2026-07-24', count: 1 }]
  }, '2026-07-25', 30)

  expect(report.habits[0].qualifiesForHighlights).toBe(false)
  expect(report.bestHabit).toBeNull()
  expect(report.attentionHabit).toBeNull()
})
```

- [ ] **Step 6: 运行领域测试**

Run: `pnpm test:run tests/domain/insights.test.ts tests/domain/weekly-report.test.ts`

Expected: 两个测试文件全部 PASS；现有周报仍包含进行中的今天。

- [ ] **Step 7: 提交领域检查点（仅在用户授权 commit 后）**

```bash
git add src/domain/insightTypes.ts src/domain/insights.ts tests/domain/insights.test.ts
git commit -m "feat: add long-term insight calculations"
```

## Task 3：实现同日共现纯函数

**Files:**
- Modify: `src/domain/insightTypes.ts`
- Create: `src/domain/coOccurrence.ts`
- Create: `tests/domain/co-occurrence.test.ts`

- [ ] **Step 1: 先写三类结果和样本门槛失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { buildCoOccurrenceReport } from '../../src/domain/coOccurrence'
import type { Store } from '../../src/domain/types'

const habits = [
  { id: 'a', name: 'A', targetPerDay: 1, createdOn: '2026-07-01', archivedOn: null },
  { id: 'b', name: 'B', targetPerDay: 2, createdOn: '2026-07-01', archivedOn: null }
]

describe('same-day co-occurrence', () => {
  it('splits shared valid days into both complete, both incomplete and opposite', () => {
    const store: Store = {
      version: 1,
      habits,
      completions: [
        { habitId: 'a', date: '2026-07-21', count: 1 },
        { habitId: 'b', date: '2026-07-21', count: 2 },
        { habitId: 'a', date: '2026-07-22', count: 1 },
        { habitId: 'b', date: '2026-07-23', count: 2 }
      ]
    }
    const pair = buildCoOccurrenceReport(store, '2026-07-25', 7).pairs[0]

    expect(pair.commonDays).toBe(7)
    expect(pair.bothComplete).toBe(1)
    expect(pair.bothIncomplete).toBe(4)
    expect(pair.opposite).toBe(2)
    expect(pair.sampleLevel).toBe('preliminary')
  })

  it('keeps fewer than seven shared days out of rankings', () => {
    const shortStore: Store = {
      version: 1,
      habits: habits.map((habit) => ({ ...habit, createdOn: '2026-07-20' })),
      completions: []
    }
    const report = buildCoOccurrenceReport(shortStore, '2026-07-25', 30)

    expect(report.pairs[0].sampleLevel).toBe('collecting')
    expect(report.leadingPair).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:run tests/domain/co-occurrence.test.ts`

Expected: FAIL，提示无法解析 `src/domain/coOccurrence`。

- [ ] **Step 3: 增加共现类型**

```ts
// append to src/domain/insightTypes.ts
export type CoOccurrenceView = 'bothComplete' | 'bothIncomplete' | 'opposite'
export type SampleLevel = 'collecting' | 'preliminary' | 'rankable'

export interface CoOccurrencePair {
  habitAId: string
  habitAName: string
  habitBId: string
  habitBName: string
  commonDays: number
  bothComplete: number
  bothIncomplete: number
  opposite: number
  bothCompleteRate: number
  bothIncompleteRate: number
  oppositeRate: number
  sampleLevel: SampleLevel
  dominantView: CoOccurrenceView
  dominantRate: number
}

export interface CoOccurrenceReport {
  pairs: CoOccurrencePair[]
  leadingPair: CoOccurrencePair | null
}
```

- [ ] **Step 4: 实现可解释的共现计算**

`buildCoOccurrenceReport` 的稳定接口：

```ts
export function buildCoOccurrenceReport(
  store: Store,
  today: DateKey,
  range: InsightRange
): CoOccurrenceReport
```

计数逻辑使用以下代码，不使用 Pearson、Phi 或因果术语：

```ts
const complete = (store: Store, habit: Habit, date: DateKey) =>
  (store.completions.find(
    (item) => item.habitId === habit.id && item.date === date
  )?.count ?? 0) === habit.targetPerDay

const sampleLevel = (days: number): SampleLevel =>
  days < 7 ? 'collecting' : days < 14 ? 'preliminary' : 'rankable'

const roundedShare = (count: number, total: number) =>
  total === 0 ? 0 : Math.round((count / total) * 100)
```

每一对习惯仅使用 `isHabitActiveOn(A, date) && isHabitActiveOn(B, date)` 的日期。`leadingPair` 只从 `rankable` 中选择，先按 `dominantRate` 降序，再按 `commonDays` 降序，最后按 `habitAName + habitBName` 升序，保证并列稳定。

- [ ] **Step 5: 增加生命周期、14 天门槛和并列测试**

测试必须证明：

- 创建日前和归档次日后的日期不进入共同日期。
- `commonDays === 14` 时为 `rankable`。
- 两个组合分数相同时按共同日期和名称稳定排序。
- `bothComplete + bothIncomplete + opposite === commonDays`。
- 三个百分比仅因四舍五入允许总和为 99、100 或 101。

- [ ] **Step 6: 运行全部领域测试**

Run: `pnpm test:run tests/domain`

Expected: 所有领域测试 PASS。

- [ ] **Step 7: 提交共现检查点（仅在用户授权 commit 后）**

```bash
git add src/domain/insightTypes.ts src/domain/coOccurrence.ts tests/domain/co-occurrence.test.ts
git commit -m "feat: calculate explainable habit co-occurrence"
```

## Task 4：接入一级导航、路由和洞察空状态

**Files:**
- Create: `src/pages/InsightsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Create: `tests/ui/InsightsPage.test.tsx`
- Modify: `tests/ui/App.test.tsx`

- [ ] **Step 1: 写导航与空状态失败测试**

```ts
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'

describe('洞察页入口', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T12:00:00'))
    localStorage.clear()
    window.location.hash = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds insights beside today, week and manage', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    await user.click(screen.getByRole('button', { name: '开始记录' }))

    const insightLinks = screen.getAllByRole('link', { name: '洞察' })
    expect(insightLinks.length).toBeGreaterThan(0)
    await user.click(insightLinks[0])
    expect(screen.getByRole('heading', { name: '长期洞察' })).toBeInTheDocument()
    expect(screen.getByText('创建第一个习惯后，这里会开始积累趋势')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:run tests/ui/InsightsPage.test.tsx`

Expected: FAIL，找不到“洞察”链接。

- [ ] **Step 3: 注册页面和四项导航**

`src/App.tsx` 增加：

```tsx
import { InsightsPage } from './pages/InsightsPage'

<Route path="/insights" element={<InsightsPage />} />
```

`src/components/AppShell.tsx` 增加 `ChartNoAxesCombined` 图标和导航项：

```ts
const navigation = [
  { to: '/today', label: '今天', icon: ListChecks },
  { to: '/week', label: '本周', icon: CalendarDays },
  { to: '/insights', label: '洞察', icon: ChartNoAxesCombined },
  { to: '/manage', label: '管理', icon: Settings2 }
]
```

- [ ] **Step 4: 实现最小洞察页和空状态**

```tsx
import { BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../app/AppStore'

export function InsightsPage() {
  const { store } = useAppStore()
  if (!store) return null

  return (
    <div className="insights-page page-enter">
      <section className="primary-panel insights-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">INSIGHTS</span>
            <h1>长期洞察</h1>
          </div>
        </div>
        {store.habits.length === 0 && (
          <div className="empty-state insights-empty">
            <span className="empty-mark"><BarChart3 size={22} /></span>
            <h2>创建第一个习惯后，这里会开始积累趋势</h2>
            <p>洞察只使用你的真实记录，不会生成示例结论。</p>
            <Link className="button primary" to="/manage">前往管理</Link>
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 5: 让现有 App UI 测试接受四项导航**

在 `tests/ui/App.test.tsx` 的示例数据流程中点击“洞察”，确认页面可达，再返回“本周”；不要删除原有本周断言。

- [ ] **Step 6: 运行 UI 回归**

Run: `pnpm test:run tests/ui/App.test.tsx tests/ui/InsightsPage.test.tsx`

Expected: 两个 UI 测试文件全部 PASS。

- [ ] **Step 7: 提交入口检查点（仅在用户授权 commit 后）**

```bash
git add src/App.tsx src/components/AppShell.tsx src/pages/InsightsPage.tsx tests/ui
git commit -m "feat: add insights route and navigation"
```

## Task 5：实现范围切换、总览指标和趋势图

**Files:**
- Create: `src/components/InsightRangeTabs.tsx`
- Create: `src/components/InsightSummaryCards.tsx`
- Create: `src/components/InsightTrendChart.tsx`
- Modify: `src/pages/InsightsPage.tsx`
- Modify: `tests/ui/InsightsPage.test.tsx`

- [ ] **Step 1: 写范围切换和总览失败测试**

在 `tests/ui/InsightsPage.test.tsx` 增加确定性数据助手：

```ts
import { addDays } from '../../src/domain/dates'
import type { Completion, Store } from '../../src/domain/types'

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
  localStorage.setItem('xunji.store.v1', JSON.stringify(store))
  window.location.hash = '#/insights'
}
```

调用 `seedInsightStore()` 和 `render(<App />)` 后断言：

```ts
expect(screen.getByRole('button', { name: '30 天' })).toHaveAttribute('aria-pressed', 'true')
expect(screen.getByText(/截至 7月24日/)).toBeInTheDocument()
expect(screen.getByText('整体执行率')).toBeInTheDocument()

await user.click(screen.getByRole('button', { name: '7 天' }))
expect(screen.getByRole('button', { name: '7 天' })).toHaveAttribute('aria-pressed', 'true')
expect(screen.getByTestId('insight-trend-chart')).toHaveAttribute('data-range', '7')
```

- [ ] **Step 1a: 写只有进行中今天时的稳定空状态测试**

写入一个 `createdOn: '2026-07-25'` 且只有今天 Completion 的习惯，进入洞察后断言：

```ts
expect(screen.getByText('完成第一个完整记录日后生成洞察')).toBeInTheDocument()
expect(screen.queryByText('0%')).not.toBeInTheDocument()
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:run tests/ui/InsightsPage.test.tsx`

Expected: FAIL，找不到范围按钮和趋势图。

- [ ] **Step 3: 创建范围选择组件**

```tsx
import type { InsightRange } from '../domain/insightTypes'

const ranges: InsightRange[] = [7, 30, 90]

export function InsightRangeTabs({
  value,
  onChange
}: {
  value: InsightRange
  onChange: (range: InsightRange) => void
}) {
  return (
    <div className="insight-range-tabs" role="group" aria-label="洞察时间范围">
      {ranges.map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={value === range}
          onClick={() => onChange(range)}
        >
          {range} 天
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: 创建四项总览组件**

`InsightSummaryCards` 接收 `InsightReport` 和 `onSelect(metric)`。四张卡片必须是可聚焦按钮，metric 固定为：

```ts
export type InsightSummaryMetric = 'overall' | 'plannedDays' | 'bestHabit' | 'attentionHabit'
```

空值文案固定为：

- 环比为空：“暂无可比周期”。
- 最佳为空：“数据积累中”。
- 需关注为空：“暂无稳定判断”。

- [ ] **Step 5: 创建原生 SVG 趋势组件**

`InsightTrendChart` props：

```ts
interface InsightTrendChartProps {
  range: InsightRange
  overall: InsightTrendPoint[]
  selectedHabitName: string | null
  selectedHabit: InsightTrendPoint[]
  onSelectDate: (date: string) => void
}
```

实现要求：

- SVG `viewBox="0 0 720 260"`，Y 轴固定 0–100。
- 把 `rate === null` 的点断开，不连成 0。
- overall 使用 `#20191B`，选中习惯使用 `#A98BEE`。
- 30 天额外绘制 `smoothedRate`，但保留每日可点击点。
- 每个点用透明的 44px 点击区域包裹。
- SVG 后追加 `.visually-hidden` 列表，逐项输出日期、整体执行率和选中习惯执行率。
- 根节点使用 `data-testid="insight-trend-chart"` 和 `data-range={range}`。

- [ ] **Step 6: 在页面编排 report 和选中习惯**

`InsightsPage` 状态保持最少：

```tsx
const [range, setRange] = useState<InsightRange>(30)
const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)
const report = useMemo(() => buildInsightReport(store, today, range), [store, today, range])
const selectedHabit = report.habits.find((habit) => habit.habitId === selectedHabitId) ?? null
const selectedSeries = selectedHabit
  ? buildHabitTrend(store, today, range, selectedHabit.habitId)
  : []
```

同时把完整页面标题从 Task 4 的占位骨架标题“长期洞察”更新为最终文案“看见习惯如何一起变化”，副标题显示截止日期、习惯数量和当前观察窗口。

当 `store.habits.length > 0 && report.plannedTotal === 0` 时，页面显示“完成第一个完整记录日后生成洞察”，不得渲染四张数值卡、趋势图或 `0%`。

范围改变时保留仍存在的选中习惯；Store 更新后选中习惯不存在时清空选择。

- [ ] **Step 7: 运行组件和领域测试**

Run: `pnpm test:run tests/domain/insights.test.ts tests/ui/InsightsPage.test.tsx`

Expected: PASS，且 7/30/90 切换不会写入 localStorage。

- [ ] **Step 8: 提交总览与趋势检查点（仅在用户授权 commit 后）**

```bash
git add src/components/InsightRangeTabs.tsx src/components/InsightSummaryCards.tsx src/components/InsightTrendChart.tsx src/pages/InsightsPage.tsx tests/ui/InsightsPage.test.tsx
git commit -m "feat: show insight summary and trends"
```

## Task 6：实现共现矩阵和习惯表现列表

**Files:**
- Create: `src/components/CoOccurrenceMatrix.tsx`
- Create: `src/components/HabitPerformanceList.tsx`
- Modify: `src/pages/InsightsPage.tsx`
- Modify: `tests/ui/InsightsPage.test.tsx`

- [ ] **Step 1: 写三视角矩阵失败测试**

```ts
expect(screen.getByRole('button', { name: '同时达标' })).toHaveAttribute('aria-pressed', 'true')
expect(screen.getByRole('table', { name: '习惯共现矩阵' })).toBeInTheDocument()

await user.click(screen.getByRole('button', { name: '同时未达标' }))
expect(screen.getByRole('button', { name: '同时未达标' })).toHaveAttribute('aria-pressed', 'true')
expect(screen.getByRole('button', { name: /阅读与运动，同时未达标/ })).toBeInTheDocument()

await user.click(screen.getByRole('button', { name: '按执行率排序' }))
expect(screen.getByRole('button', { name: '按执行率排序' })).toHaveAttribute('aria-pressed', 'true')
```

再断言 `sampleLevel === 'collecting'` 的单元格显示“积累中”，不会显示误导性百分比。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:run tests/ui/InsightsPage.test.tsx`

Expected: FAIL，找不到共现视角按钮。

- [ ] **Step 3: 创建矩阵组件**

`CoOccurrenceMatrix` props：

```ts
interface CoOccurrenceMatrixProps {
  habits: HabitInsight[]
  pairs: CoOccurrencePair[]
  view: CoOccurrenceView
  onViewChange: (view: CoOccurrenceView) => void
  onSelectPair: (pair: CoOccurrencePair) => void
}
```

使用语义 `<table aria-label="习惯共现矩阵">`。对角线显示“同一习惯”且不可点击；其他单元格根据当前 view 读取：

```ts
const viewRate = (pair: CoOccurrencePair, view: CoOccurrenceView) =>
  view === 'bothComplete'
    ? pair.bothCompleteRate
    : view === 'bothIncomplete'
      ? pair.bothIncompleteRate
      : pair.oppositeRate
```

可排序样本显示百分比和对应深浅；初步线索显示百分比并带“初步”；积累中显示“积累中”。按钮 `aria-label` 必须包含两项习惯、当前视角、比例或样本状态。

- [ ] **Step 4: 创建习惯表现列表**

`HabitPerformanceList` props：

```ts
export type HabitSort = 'attention' | 'rate' | 'name'

interface HabitPerformanceListProps {
  habits: HabitInsight[]
  selectedHabitId: string | null
  sort: HabitSort
  onSortChange: (sort: HabitSort) => void
  onSelectHabit: (habitId: string) => void
}
```

提供“需关注 / 执行率 / 名称”三个文字按钮，并用 `aria-pressed` 表示当前排序。排序规则固定为：

1. `attention`：`trend === 'down'` 的项按 delta 升序，其余按 rate 升序。
2. `rate`：有 rate 的项按 rate 降序，空值排在最后。
3. `name`：按中文名称 `localeCompare('zh-CN')` 升序。
4. 前三种排序仍相同时按 habitId 升序，保证稳定。

每行输出名称、执行率、有效计划日、趋势文字和百分点变化；不得只用颜色表达趋势。

- [ ] **Step 5: 页面接入共现状态**

```tsx
const [coView, setCoView] = useState<CoOccurrenceView>('bothComplete')
const [habitSort, setHabitSort] = useState<HabitSort>('attention')
const coOccurrence = useMemo(
  () => buildCoOccurrenceReport(store, today, range),
  [store, today, range]
)
```

本期线索使用 `coOccurrence.leadingPair`；为空时显示继续记录提示。线索句根据 `dominantView` 输出“经常同时达标 / 经常同时未达标 / 经常表现相反”，并始终显示共同有效日期和非因果说明。

- [ ] **Step 6: 运行共现与 UI 测试**

Run: `pnpm test:run tests/domain/co-occurrence.test.ts tests/ui/InsightsPage.test.tsx`

Expected: PASS。

- [ ] **Step 7: 提交矩阵检查点（仅在用户授权 commit 后）**

```bash
git add src/components/CoOccurrenceMatrix.tsx src/components/HabitPerformanceList.tsx src/pages/InsightsPage.tsx tests/ui/InsightsPage.test.tsx
git commit -m "feat: add co-occurrence matrix and habit ranking"
```

## Task 7：实现详情下钻和管理页定向聚焦

**Files:**
- Create: `src/components/InsightDetailContent.tsx`
- Modify: `src/components/Modal.tsx`
- Modify: `src/pages/InsightsPage.tsx`
- Modify: `src/pages/ManagePage.tsx`
- Modify: `tests/ui/InsightsPage.test.tsx`
- Modify: `tests/ui/App.test.tsx`

- [ ] **Step 1: 写下钻、关闭恢复和管理跳转失败测试**

```ts
await user.click(screen.getByRole('button', { name: /阅读与运动，同时达标/ }))
const detail = screen.getByRole('dialog', { name: /阅读与运动/ })
expect(detail).toHaveTextContent('伴随关系不代表因果')
expect(detail).toHaveTextContent('共同有效日期')

await user.click(within(detail).getByRole('button', { name: /关闭/ }))
expect(screen.getByRole('button', { name: '30 天' })).toHaveAttribute('aria-pressed', 'true')

await user.click(screen.getByRole('button', { name: /阅读，执行率/ }))
await user.click(screen.getByRole('link', { name: '前往管理' }))
expect(window.location.hash).toContain('/manage?habit=')
expect(screen.getByTestId('focused-manage-habit')).toHaveTextContent('阅读')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:run tests/ui/InsightsPage.test.tsx tests/ui/App.test.tsx`

Expected: FAIL，找不到详情 dialog 或定向管理行。

- [ ] **Step 3: 给 Modal 增加向后兼容的 sheet 变体**

Props 调整为：

```ts
interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  variant?: 'dialog' | 'sheet'
}
```

根节点类名：

```tsx
<div className={`modal-backdrop ${variant === 'sheet' ? 'is-sheet' : ''}`}>
  <section className={`modal ${variant === 'sheet' ? 'detail-sheet' : ''}`} ...>
```

默认值为 `dialog`，现有创建、编辑、归档和导入弹窗行为必须不变。继续复用 Escape、Tab 循环和关闭后还焦点逻辑。

- [ ] **Step 4: 定义详情选择联合类型和内容**

```ts
export type InsightSelection =
  | { kind: 'summary'; metric: InsightSummaryMetric }
  | { kind: 'date'; date: string }
  | { kind: 'habit'; habitId: string }
  | { kind: 'pair'; pair: CoOccurrencePair }
```

`InsightDetailContent` 根据 selection 输出：

- summary：公式、当前值和比较窗口。
- date：当天所有有效习惯的目标量和完成量。
- habit：有效日期、执行率、变化和“前往管理”链接。
- pair：共同日期、三类计数与比例、样本等级、非因果提示。

习惯链接固定为：

```tsx
<Link className="button secondary" to={`/manage?habit=${encodeURIComponent(habitId)}`}>
  前往管理
</Link>
```

- [ ] **Step 5: 在页面用 sheet 打开详情**

```tsx
const [selection, setSelection] = useState<InsightSelection | null>(null)

{selection && (
  <Modal
    title={detailTitle(selection)}
    variant="sheet"
    onClose={() => setSelection(null)}
  >
    <InsightDetailContent
      selection={selection}
      report={report}
      store={store}
      onSelectHabit={setSelectedHabitId}
    />
  </Modal>
)}
```

Store 外部更新后，如果 selection 引用的习惯已不存在，使用 effect 关闭详情；范围变化时详情重新使用新报告计算，不保留旧数值快照。

- [ ] **Step 6: 管理页读取 habit 查询参数**

使用 `useSearchParams` 得到 `habit`。对应行添加：

```tsx
className={`manage-row ${focusedHabitId === habit.id ? 'is-focused' : ''}`}
data-testid={focusedHabitId === habit.id ? 'focused-manage-habit' : undefined}
tabIndex={focusedHabitId === habit.id ? -1 : undefined}
ref={focusedHabitId === habit.id ? focusedRowRef : undefined}
```

在 effect 中调用 `focusedRowRef.current?.scrollIntoView({ block: 'center' })` 和 `focus()`。不要自动打开编辑弹窗；归档习惯也必须可以被聚焦。

- [ ] **Step 7: 运行 UI 回归**

Run: `pnpm test:run tests/ui`

Expected: 所有 UI 测试 PASS，现有弹窗焦点行为不退化。

- [ ] **Step 8: 提交下钻检查点（仅在用户授权 commit 后）**

```bash
git add src/components/Modal.tsx src/components/InsightDetailContent.tsx src/pages/InsightsPage.tsx src/pages/ManagePage.tsx tests/ui
git commit -m "feat: add insight drill-down and manage focus"
```

## Task 8：完成视觉系统、响应式和无障碍状态

**Files:**
- Modify: `src/styles.css`
- Modify: `tests/ui/InsightsPage.test.tsx`

- [ ] **Step 1: 先写无颜色依赖和键盘名称断言**

断言趋势、样本和范围状态都有文字：

```ts
expect(screen.getByText(/上升|稳定|下降|暂无可比数据/)).toBeInTheDocument()
expect(screen.getByText(/数据积累中|初步线索|共同有效日期/)).toBeInTheDocument()
expect(screen.getByRole('group', { name: '洞察时间范围' })).toBeInTheDocument()
expect(screen.getByRole('table', { name: '习惯共现矩阵' })).toBeInTheDocument()
expect(screen.getByRole('status')).toHaveTextContent(/已切换到.*天洞察/)
```

- [ ] **Step 2: 增加洞察桌面样式**

在 `src/styles.css` 增加以下独立命名空间，避免影响现有页面：

```css
.insights-shell { padding: 38px; }
.insights-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.insight-range-tabs { display: flex; gap: 4px; padding: 4px; border: 1px solid #dfe3e0; border-radius: 999px; background: #fff; }
.insight-range-tabs button { min-width: 58px; min-height: 44px; border: 0; border-radius: 999px; background: transparent; color: #666d69; cursor: pointer; }
.insight-range-tabs button[aria-pressed="true"] { color: #5c468c; background: #f2edff; box-shadow: inset 0 0 0 1px #c8b5f1; }
.insight-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 24px; }
.insight-summary-card { min-height: 128px; padding: 20px; border: 1px solid #dfe3e0; border-radius: 20px; background: #fff; text-align: left; cursor: pointer; }
.insight-main-grid { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(280px, .75fr); gap: 12px; margin-top: 12px; }
.insight-card { border: 1px solid #dfe3e0; border-radius: 20px; background: #fff; }
.insight-trend-card, .cooccurrence-card, .habit-performance-card { padding: 22px; }
.insight-signal-card { padding: 22px; background: #20191b; color: #fff; }
.insight-lower-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; margin-top: 12px; }
.insight-trend-chart { width: 100%; min-height: 260px; }
.cooccurrence-scroll { overflow-x: auto; overscroll-behavior-inline: contain; }
.cooccurrence-table { width: 100%; min-width: 560px; border-collapse: separate; border-spacing: 6px; }
.cooccurrence-table th:first-child { position: sticky; left: 0; z-index: 1; background: #fff; }
.cooccurrence-cell button { width: 100%; min-width: 56px; min-height: 44px; border: 0; border-radius: 8px; }
.manage-row.is-focused { border-color: #a98bee; box-shadow: 0 0 0 3px #f2edff; }
.modal-backdrop.is-sheet { place-items: stretch end; padding: 0; }
.detail-sheet { width: min(520px, 100%); height: 100vh; max-height: none; border-radius: 24px 0 0 24px; }
```

- [ ] **Step 3: 增加手机和平板规则**

```css
@media (max-width: 1023px) {
  .mobile-nav { grid-template-columns: repeat(4, 1fr); }
  .insight-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .insight-main-grid, .insight-lower-grid { grid-template-columns: 1fr; }
  .insight-signal-card { order: 2; }
}

@media (max-width: 640px) {
  .insights-shell { padding: 20px; border-radius: 18px; }
  .insights-heading { align-items: flex-start; flex-direction: column; }
  .insight-range-tabs { width: 100%; }
  .insight-range-tabs button { flex: 1; }
  .insight-summary-card { min-width: 0; padding: 16px; }
  .insight-trend-card, .cooccurrence-card, .habit-performance-card, .insight-signal-card { padding: 18px; }
  .modal-backdrop.is-sheet { align-items: end; }
  .detail-sheet { width: 100%; height: auto; max-height: 92vh; border-radius: 24px 24px 0 0; }
}
```

现有 `prefers-reduced-motion` 全局规则继续覆盖所有新动画。新增过渡只允许 border、background、opacity 和 transform，时长 180–240ms。

在 `InsightsPage` 增加仅供辅助技术读取的结果播报：

```tsx
<p className="visually-hidden" role="status" aria-live="polite">
  已切换到 {range} 天洞察，共 {report.plannedDays} 个有效计划日
</p>
```

- [ ] **Step 4: 人工检查 320px 的矩阵滚动边界**

Run: `pnpm dev`

Expected:

- 页面 `documentElement.scrollWidth === clientWidth`。
- 只有 `.cooccurrence-scroll` 可以水平滚动。
- 首列习惯名称保持可见。
- 四项底部导航文字不截断，点击目标不小于 44px。

- [ ] **Step 5: 运行组件测试与类型检查**

Run: `pnpm typecheck`

Expected: exit code 0。

Run: `pnpm test:run tests/ui`

Expected: PASS。

- [ ] **Step 6: 提交视觉检查点（仅在用户授权 commit 后）**

```bash
git add src/styles.css tests/ui/InsightsPage.test.tsx
git commit -m "style: finish responsive insights dashboard"
```

## Task 9：扩展示例数据，使洞察可以被真实演示

**Files:**
- Modify: `src/data/demo.ts`
- Modify: `tests/data/demo.test.ts`
- Modify: `tests/domain/co-occurrence.test.ts`

- [ ] **Step 1: 先写示例数据失败测试**

```ts
it('creates sixty complete historical days for long-term insights', () => {
  const store = createDemoStore('2026-07-25')
  const dates = [...new Set(store.completions.map((item) => item.date))].sort()

  expect(store.habits).toHaveLength(3)
  expect(store.habits.every((habit) => habit.createdOn === '2026-05-26')).toBe(true)
  expect(dates[0]).toBe('2026-05-26')
  expect(dates.at(-1)).toBe('2026-07-25')

  const coOccurrence = buildCoOccurrenceReport(store, '2026-07-25', 30)
  expect(coOccurrence.leadingPair?.sampleLevel).toBe('rankable')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:run tests/data/demo.test.ts`

Expected: FAIL，现有示例只有约两周。

- [ ] **Step 3: 用确定性模式生成 60 个完整历史日**

保留三项习惯和当前名称，把 `createdOn` 改为 `addDays(today, -60)`。使用固定规则生成 `-60..0`：

```ts
for (let offset = -60; offset <= 0; offset += 1) {
  const date = addDays(today, offset)
  const index = offset + 60
  const reading = index % 6 === 0 ? 0 : 1
  const exercise = reading === 1 && index % 4 !== 0 ? 1 : 0
  const english = index % 5 === 0 ? 1 : 2

  addCompletion(completions, 'demo-reading', date, reading)
  addCompletion(completions, 'demo-exercise', date, exercise)
  addCompletion(completions, 'demo-english', date, english)
}
```

这会生成可解释的阅读/运动正向同日共现，同时保留英语目标为 2 的部分完成案例。不得使用随机数，保证测试和截图稳定。

- [ ] **Step 4: 验证示例仍满足原有周报和记录流程**

Run: `pnpm test:run tests/data/demo.test.ts tests/ui/App.test.tsx tests/domain/weekly-report.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交示例检查点（仅在用户授权 commit 后）**

```bash
git add src/data/demo.ts tests/data/demo.test.ts tests/domain/co-occurrence.test.ts
git commit -m "testdata: extend demo history for insights"
```

## Task 10：端到端验证、文档同步和最终质量门

**Files:**
- Modify: `tests/e2e/app.spec.ts`
- Modify: `docs/design/high-fidelity-prototype.md`
- Modify: `openspec/changes/add-insights-dashboard/tasks.md`

- [ ] **Step 1: 增加洞察主流程 E2E**

```ts
test('demo insights support range switching, co-occurrence drill-down and manage focus', async ({ page }) => {
  await page.getByRole('button', { name: '载入示例' }).click()
  await page.getByRole('link', { name: '洞察', exact: true }).filter({ visible: true }).click()

  await expect(page.getByRole('heading', { name: '看见习惯如何一起变化' })).toBeVisible()
  await expect(page.getByRole('button', { name: '30 天' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '90 天' }).click()
  await expect(page.getByTestId('insight-trend-chart')).toHaveAttribute('data-range', '90')

  await page.getByRole('button', { name: '30 天' }).click()
  const pair = page.getByRole('button', { name: /阅读 30 分钟与拉伸与训练，同时达标/ }).first()
  await pair.click()
  const detail = page.getByRole('dialog', { name: /阅读 30 分钟与拉伸与训练/ })
  await expect(detail.getByText('伴随关系不代表因果')).toBeVisible()
  await detail.getByRole('button', { name: /关闭/ }).click()

  await page.getByRole('button', { name: /阅读 30 分钟，执行率/ }).click()
  await page.getByRole('link', { name: '前往管理' }).click()
  await expect(page.getByTestId('focused-manage-habit')).toContainText('阅读 30 分钟')
})
```

- [ ] **Step 2: 扩展视口测试和截图**

在现有 `[320, 390, 768, 1024, 1440]` 循环中：

- 每个视口进入洞察并检查页面无横向溢出。
- 手机确认 `.mobile-nav` 有四个链接。
- 1024px 以上确认 `.desktop-nav` 有四个链接。
- 390px 和 1440px 分别保存 `*-insights.png`。
- 320、390、768px 检查洞察内可见按钮均不小于 44px。

- [ ] **Step 3: 运行 E2E**

Run: `pnpm test:e2e`

Expected: 所有 Chromium E2E PASS；`output/playwright` 生成今天、本周、管理、洞察双端截图。

- [ ] **Step 4: 同步最终设计文档**

在 `docs/design/high-fidelity-prototype.md` 增加：

- 一级导航已扩展为四项。
- 洞察页的 7/30/90 天范围。
- 总览、趋势、本期线索、矩阵、排行和下钻组件。
- 桌面右侧 sheet、手机底部 sheet。
- 洞察排除今天但本周保留今天的职责差异。

不得删除原有今天、本周、管理约定。

- [ ] **Step 5: 更新 OpenSpec 任务状态并严格校验**

完成一项后才把对应 checkbox 改为 `[x]`。

Run: `openspec validate add-insights-dashboard --strict`

Expected: PASS。

- [ ] **Step 6: 执行完整质量门**

Run: `pnpm typecheck`

Expected: exit code 0。

Run: `pnpm test:run`

Expected: 所有 Vitest 测试 PASS。

Run: `pnpm test:e2e`

Expected: 所有 Playwright 测试 PASS。

Run: `pnpm build`

Expected: TypeScript build 和 Vite production build 成功，`dist/` 生成。

- [ ] **Step 7: 检查依赖和工作区范围**

Run: `git diff -- package.json pnpm-lock.yaml`

Expected: 无新增 Tailwind、shadcn、Recharts、Framer Motion 或 Radix 依赖。

Run: `git diff --check`

Expected: 无空白错误。

Run: `git status --short`

Expected: 只包含本计划列出的文件以及执行前已经存在的用户改动；不得混入 `.superpowers/` 临时视觉文件。

- [ ] **Step 8: 提交最终检查点（仅在用户授权 commit 后）**

```bash
git add src tests docs/design/high-fidelity-prototype.md openspec/changes/add-insights-dashboard
git commit -m "feat: add responsive habit insights dashboard"
```

不得执行 `git push`，除非用户在执行阶段再次明确授权。

## 完成定义

- 新增“洞察”一级页面，其他三个页面职责和行为不回退。
- Store v1 与导入导出格式完全不变。
- 7、30、90 天窗口、环比、趋势和样本门槛均由领域纯函数测试覆盖。
- 共现只输出同时达标、同时未达标和表现相反，不输出因果结论。
- 桌面和手机均能完成范围切换、查看趋势、打开详情和前往管理。
- 所有质量门、OpenSpec 严格校验和目标视口检查通过。
- 没有新增计划外依赖、网络请求或外部图片。
