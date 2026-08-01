import { expect, test, type Page, type Request, type Response, type TestInfo } from '@playwright/test'

const HABIT_COUNT = 10
const DAYS_PER_HABIT = 365
const COMPLETION_COUNT = HABIT_COUNT * DAYS_PER_HABIT
const SAMPLE_COUNT = 20
const SAMPLE_LIMIT_MS = 1000
const EXPECTED_PAGE_KEYS = [
  'habits:range=0-9/*',
  'completions:range=0-999/*',
  'completions:range=1000-1999/*',
  'completions:range=2000-2999/*',
  'completions:range=3000-3649/*'
]

interface Account {
  email: string
  password: string
}

interface Sample {
  durationMs: number
  habitRows: number
  completionRows: number
  pageKeys: string[]
}

function createAccount(testInfo: TestInfo): Account {
  const slug = testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 20)
  return {
    email: `e2e-performance-${slug}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.test`,
    password: `E2e-${crypto.randomUUID()}-9aA!`
  }
}

function localDateOffset(daysBeforeToday: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysBeforeToday)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function createBenchmarkStore() {
  const dates = Array.from({ length: DAYS_PER_HABIT }, (_, index) => localDateOffset(index))
  const habits = Array.from({ length: HABIT_COUNT }, (_, index) => ({
    id: `performance-habit-${String(index + 1).padStart(2, '0')}`,
    name: `性能习惯 ${index + 1}`,
    targetPerDay: 1,
    createdOn: dates.at(-1)!,
    archivedOn: null
  }))

  return {
    version: 1,
    habits,
    completions: habits.flatMap((habit) =>
      dates.map((date) => ({ habitId: habit.id, date, count: 1 }))
    )
  }
}

async function signUp(page: Page, account: Account): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '创建账号' }).click()
  await page.getByLabel('邮箱').fill(account.email)
  await page.getByLabel('密码').fill(account.password)
  await page.getByRole('button', { name: '创建账号', exact: true }).click()
  await expect(page.getByRole('heading', { name: '让行动留下清晰的轨迹。' })).toBeVisible()
}

async function importBenchmarkStore(page: Page): Promise<void> {
  await page.getByRole('button', { name: '开始记录' }).click()
  await page.getByRole('link', { name: '管理', exact: true }).filter({ visible: true }).click()
  await expect(page.getByRole('heading', { name: '习惯管理' })).toBeVisible()

  await page.getByLabel('选择 JSON 备份').setInputFiles({
    name: 'performance-baseline.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(createBenchmarkStore()))
  })
  const dialog = page.getByRole('dialog', { name: '确认替换数据' })
  await expect(dialog.getByText(`${HABIT_COUNT} 项`)).toBeVisible()
  await expect(dialog.getByText(`${COMPLETION_COUNT} 条`)).toBeVisible()
  await dialog.getByRole('button', { name: '完整替换' }).click()
  await expect(page.getByRole('link', { name: '今天', exact: true }).filter({ visible: true })).toBeVisible()
  await page.getByRole('link', { name: '今天', exact: true }).filter({ visible: true }).click()
  await expect(page.getByTestId('habit-row')).toHaveCount(HABIT_COUNT)
}

type DataTable = 'habits' | 'completions'

function tableName(url: string): DataTable | null {
  const pathname = new URL(url).pathname
  if (pathname === '/rest/v1/habits') return 'habits'
  if (pathname === '/rest/v1/completions') return 'completions'
  return null
}

async function pageKey(response: Response): Promise<string | null> {
  const table = tableName(response.request().url())
  if (!table) return null
  const contentRange = await response.headerValue('content-range')
  if (!contentRange) throw new Error(`${table} 分页响应缺少 Content-Range 标识`)
  return `${table}:range=${contentRange}`
}

async function countRows(responses: Response[]): Promise<{
  habitRows: number
  completionRows: number
  pageKeys: string[]
}> {
  let habitRows = 0
  let completionRows = 0
  const pageKeys: string[] = []

  for (const response of responses) {
    const request = response.request()
    const table = tableName(request.url())
    if (!table) continue
    const key = await pageKey(response)
    if (!key) throw new Error('计入的分页响应必须有页面标识')
    pageKeys.push(key)
    const body: unknown = await response.json()
    expect(Array.isArray(body), `${table} 分页响应必须是数组`).toBe(true)
    if (!Array.isArray(body)) throw new Error(`${table} 分页响应必须是数组`)
    if (table === 'habits') habitRows += body.length
    if (table === 'completions') completionRows += body.length
  }

  return { habitRows, completionRows, pageKeys }
}

async function measureRefresh(page: Page): Promise<Sample> {
  const responses: Response[] = []
  const refreshRequests = new Set<Request>()
  let readStartedAt: number | undefined
  const onRequest = (request: Request) => {
    const url = new URL(request.url())
    if (
      readStartedAt === undefined &&
      request.method() === 'GET' &&
      url.pathname === '/rest/v1/user_data_state'
    ) {
      readStartedAt = performance.now()
    }
    if (readStartedAt !== undefined && request.method() === 'GET' && tableName(request.url())) {
      refreshRequests.add(request)
    }
  }
  const onResponse = (response: Response) => {
    if (refreshRequests.has(response.request())) responses.push(response)
  }

  page.on('request', onRequest)
  page.on('response', onResponse)
  try {
    await page.reload()
    await expect(page.getByTestId('habit-row')).toHaveCount(HABIT_COUNT)
    await expect(page.locator('.summary-panel')).toBeVisible()
    expect(readStartedAt, '必须从 user_data_state 首个 GET 开始计时').toBeDefined()
    const durationMs = performance.now() - readStartedAt!
    const { habitRows, completionRows, pageKeys } = await countRows(responses)
    return { durationMs, habitRows, completionRows, pageKeys }
  } finally {
    page.off('request', onRequest)
    page.off('response', onResponse)
  }
}

function percentile95(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.ceil(sorted.length * 0.95) - 1]
}

function expectExpectedPages(pageKeys: string[], sampleNumber: number): void {
  const uniquePageKeys = new Set(pageKeys)
  expect(
    uniquePageKeys.size,
    `第 ${sampleNumber} 次刷新不得重复计入分页响应`
  ).toBe(pageKeys.length)
  expect(
    [...uniquePageKeys].sort(),
    `第 ${sampleNumber} 次刷新必须只包含 1 个 habits 页和 4 个 completions 页`
  ).toEqual([...EXPECTED_PAGE_KEYS].sort())
}

test('3650 records load completely within the local paginated-read baseline', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await signUp(page, createAccount(testInfo))
  await importBenchmarkStore(page)

  await page.reload()
  await expect(page.getByTestId('habit-row')).toHaveCount(HABIT_COUNT)
  await expect(page.locator('.summary-panel')).toBeVisible()

  const samples: Sample[] = []
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const sample = await measureRefresh(page)
    expect(sample.habitRows, `第 ${index + 1} 次刷新应完整读取 habits`).toBe(HABIT_COUNT)
    expect(sample.completionRows, `第 ${index + 1} 次刷新应完整读取 completions`).toBe(COMPLETION_COUNT)
    expectExpectedPages(sample.pageKeys, index + 1)
    samples.push(sample)
  }

  const durations = samples.map((sample) => sample.durationMs)
  const underLimit = durations.filter((duration) => duration <= SAMPLE_LIMIT_MS).length
  const p95 = percentile95(durations)
  await testInfo.attach('performance-baseline.json', {
    body: JSON.stringify({ samples, p95, underLimit, sampleLimitMs: SAMPLE_LIMIT_MS }),
    contentType: 'application/json'
  })
  console.log(
    `performance baseline: samples=${durations.map((value) => value.toFixed(1)).join(',')}ms; ` +
      `p95=${p95.toFixed(1)}ms; complete=${samples.filter((sample) => sample.habitRows === HABIT_COUNT && sample.completionRows === COMPLETION_COUNT).length}/${SAMPLE_COUNT}; ` +
      `under-${SAMPLE_LIMIT_MS}ms=${underLimit}/${SAMPLE_COUNT}; ` +
      `expected-pages=${EXPECTED_PAGE_KEYS.join('|')}`
  )

  expect(samples).toHaveLength(SAMPLE_COUNT)
  expect(underLimit, `P95=${p95.toFixed(1)}ms; samples=${durations.map((value) => value.toFixed(1)).join(',')}`).toBeGreaterThanOrEqual(19)
})
