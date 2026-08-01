import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test'
import { readFile } from 'node:fs/promises'

interface Account {
  email: string
  password: string
}

function createAccount(testInfo: TestInfo, suffix: string): Account {
  const slug = testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 20)
  return {
    email: `e2e-backend-${slug}-${suffix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.test`,
    password: `E2e-${crypto.randomUUID()}-9aA!`
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

async function signIn(page: Page, account: Account): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '登录循迹' })).toBeVisible()
  await page.getByLabel('邮箱').fill(account.email)
  await page.getByLabel('密码').fill(account.password)
  await page.getByRole('button', { name: '登录循迹' }).click()
  await expect(page.getByLabel(`当前账号：${account.email}`)).toBeVisible()
}

async function startEmptyStore(page: Page): Promise<void> {
  await page.getByRole('button', { name: '开始记录' }).click()
  await expect(page.getByText('本机账号数据')).toBeVisible()
}

async function createHabit(page: Page, name: string, target = '3'): Promise<void> {
  const emptyStateCreate = page.getByRole('button', { name: '创建习惯', exact: true })
  if (await emptyStateCreate.isVisible()) {
    await emptyStateCreate.click()
  } else {
    await page.getByRole('button', { name: '快速创建习惯' }).click()
  }
  const dialog = page.getByRole('dialog', { name: '创建习惯' })
  await dialog.getByLabel('习惯名称').fill(name)
  await dialog.getByLabel('每日目标').fill(target)
  await dialog.getByRole('button', { name: '保存习惯' }).click()
  await expect(page.getByTestId('habit-row').filter({ hasText: name })).toBeVisible()
}

async function openManage(page: Page): Promise<void> {
  await page.getByRole('link', { name: '管理', exact: true }).filter({ visible: true }).click()
  await expect(page.getByRole('heading', { name: '习惯管理' })).toBeVisible()
}

async function openToday(page: Page): Promise<void> {
  await page.getByRole('link', { name: '今天', exact: true }).filter({ visible: true }).click()
}

async function localDate(page: Page): Promise<string> {
  return page.evaluate(() => {
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
  })
}

async function closeContext(context: BrowserContext | undefined): Promise<void> {
  if (context) await context.close()
}

test('two isolated browser contexts persist one account while keeping a colliding second account separate', async ({
  browser
}, testInfo) => {
  test.setTimeout(60_000)
  const accountA = createAccount(testInfo, 'a')
  const accountB = createAccount(testInfo, 'b')
  const legacyStore = JSON.stringify({
    version: 1,
    habits: [{ id: 'legacy-only', name: '旧本地数据不得显示', targetPerDay: 1, createdOn: '2026-01-01', archivedOn: null }],
    completions: []
  })
  const habitName = '跨上下文习惯'
  const archivedHabitName = '导出归档习惯'
  const isolatedHabitName = '隔离账号同键习惯'
  const replacedHabitName = '将被完整替换的习惯'
  let contextA: BrowserContext | undefined
  let contextSameAccount: BrowserContext | undefined
  let contextOtherAccount: BrowserContext | undefined

  try {
    contextA = await browser.newContext()
    const pageA = await contextA.newPage()
    await pageA.goto('/')
    const today = await localDate(pageA)
    await pageA.evaluate((value) => localStorage.setItem('xunji.store.v1', value), legacyStore)
    await signUp(pageA, accountA)
    await startEmptyStore(pageA)
    await createHabit(pageA, habitName)
    const rowA = pageA.getByTestId('habit-row').filter({ hasText: habitName })
    await rowA.getByRole('button', { name: `${habitName}，增加一次` }).click()
    await expect(rowA.getByText('1 / 3')).toBeVisible()
    await createHabit(pageA, archivedHabitName, '2')
    const archivedRowA = pageA.getByTestId('habit-row').filter({ hasText: archivedHabitName })
    await archivedRowA.getByRole('button', { name: `${archivedHabitName}，增加一次` }).click()
    await expect(archivedRowA.getByText('1 / 2')).toBeVisible()

    contextSameAccount = await browser.newContext()
    const pageSameAccount = await contextSameAccount.newPage()
    await signIn(pageSameAccount, accountA)
    const rowSameAccount = pageSameAccount.getByTestId('habit-row').filter({ hasText: habitName })
    await expect(rowSameAccount.getByText('1 / 3')).toBeVisible()
    await rowSameAccount.getByRole('button', { name: `${habitName}，增加一次` }).click()
    await expect(rowSameAccount.getByText('2 / 3')).toBeVisible()

    await pageA.reload()
    await expect(rowA.getByText('2 / 3')).toBeVisible()
    await openManage(pageA)
    await pageA.getByRole('button', { name: `归档${archivedHabitName}` }).click()
    await pageA.getByRole('button', { name: '确认归档' }).click()
    await expect(pageA.getByText(/归档于.*历史数据保留/)).toBeVisible()
    await pageA.getByRole('button', { name: '退出账号' }).click()
    await expect(pageA.getByRole('heading', { name: '登录循迹' })).toBeVisible()
    await signIn(pageA, accountA)
    await expect(rowA.getByText('2 / 3')).toBeVisible()

    contextOtherAccount = await browser.newContext()
    const pageOtherAccount = await contextOtherAccount.newPage()
    await signUp(pageOtherAccount, accountB)
    await expect(pageOtherAccount.getByText(habitName)).toHaveCount(0)
    await expect(pageOtherAccount.getByText(archivedHabitName)).toHaveCount(0)
    await startEmptyStore(pageOtherAccount)
    await expect(pageOtherAccount.getByText(habitName)).toHaveCount(0)
    await expect(pageOtherAccount.getByText(archivedHabitName)).toHaveCount(0)
    await createHabit(pageOtherAccount, replacedHabitName)

    await openManage(pageA)
    const downloadPromise = pageA.waitForEvent('download')
    await pageA.getByRole('button', { name: '导出完整备份' }).click()
    const downloadedBackup = await downloadPromise
    const downloadedPath = await downloadedBackup.path()
    expect(downloadedPath).not.toBeNull()
    const exportedStore = JSON.parse(await readFile(downloadedPath!, 'utf8')) as {
      version: number
      habits: Array<{ id: string; name: string; targetPerDay: number; createdOn: string; archivedOn: string | null }>
      completions: Array<{ habitId: string; date: string; count: number }>
    }
    const primaryHabit = exportedStore.habits.find((habit) => habit.name === habitName)
    expect(primaryHabit).toBeDefined()
    const archivedHabit = exportedStore.habits.find((habit) => habit.name === archivedHabitName)
    expect(archivedHabit).toBeDefined()
    expect({
      version: exportedStore.version,
      habits: exportedStore.habits.map(({ id, ...habit }) => habit).sort((left, right) => left.name.localeCompare(right.name)),
      completions: exportedStore.completions
        .map((completion) => ({ ...completion, habitName: exportedStore.habits.find((habit) => habit.id === completion.habitId)?.name }))
        .sort((left, right) => left.habitName!.localeCompare(right.habitName!))
    }).toEqual({
      version: 1,
      habits: [
        { name: archivedHabitName, targetPerDay: 2, createdOn: today, archivedOn: today },
        { name: habitName, targetPerDay: 3, createdOn: today, archivedOn: null }
      ],
      completions: [
        { habitId: archivedHabit!.id, date: today, count: 1, habitName: archivedHabitName },
        { habitId: primaryHabit!.id, date: today, count: 2, habitName }
      ]
    })

    await openToday(pageA)
    let blockedWrite = false
    await pageA.route('**/rest/v1/completions*', async (route) => {
      if (!blockedWrite && route.request().method() !== 'GET') {
        blockedWrite = true
        await route.abort('failed')
        return
      }
      await route.continue()
    })
    try {
      await rowA.getByRole('button', { name: `${habitName}，增加一次` }).click()
      await expect.poll(() => blockedWrite).toBe(true)
      await expect(pageA.getByText('未保存，请重试')).toBeVisible()
      await expect(rowA.locator('.stepper strong')).toHaveText('2 / 3')
    } finally {
      await pageA.unroute('**/rest/v1/completions*')
    }
    await pageA.reload()
    await expect(rowA.getByText('2 / 3')).toBeVisible()
    await expect(pageA.getByText('旧本地数据不得显示')).toHaveCount(0)
    await expect(pageA.evaluate(() => localStorage.getItem('xunji.store.v1'))).resolves.toBe(legacyStore)

    await openManage(pageOtherAccount)
    const importedStore = {
      version: 1,
      habits: [{
        id: primaryHabit!.id,
        name: isolatedHabitName,
        targetPerDay: 1,
        createdOn: today,
        archivedOn: null
      }],
      completions: [{ habitId: primaryHabit!.id, date: today, count: 1 }]
    }
    const backupInput = pageOtherAccount.getByLabel('选择 JSON 备份')
    await backupInput.setInputFiles({
      name: 'isolated-valid-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(importedStore))
    })
    const confirmImport = pageOtherAccount.getByRole('dialog', { name: '确认替换数据' })
    await expect(confirmImport.getByText('1 项')).toBeVisible()
    await expect(confirmImport.getByText('1 条')).toBeVisible()
    await confirmImport.getByRole('button', { name: '完整替换' }).click()
    await expect(pageOtherAccount.getByText(isolatedHabitName)).toBeVisible()
    await expect(pageOtherAccount.getByText(replacedHabitName)).toHaveCount(0)
    await pageOtherAccount.reload()
    await openToday(pageOtherAccount)
    const importedRow = pageOtherAccount.getByTestId('habit-row').filter({ hasText: isolatedHabitName })
    await expect(importedRow.getByText('1 / 1')).toBeVisible()

    await openManage(pageOtherAccount)
    await backupInput.setInputFiles({
      name: 'invalid-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...importedStore, version: 2 }))
    })
    await expect(pageOtherAccount.getByRole('alert')).toBeVisible()
    await expect(pageOtherAccount.getByText(isolatedHabitName)).toBeVisible()
    await pageOtherAccount.reload()
    await openToday(pageOtherAccount)
    await expect(importedRow.getByText('1 / 1')).toBeVisible()

    await pageA.reload()
    await expect(pageA.getByText(habitName)).toBeVisible()
    await expect(pageA.getByText(isolatedHabitName)).toHaveCount(0)
    await expect(rowA.getByText('2 / 3')).toBeVisible()
  } finally {
    await Promise.allSettled([
      closeContext(contextOtherAccount),
      closeContext(contextSameAccount),
      closeContext(contextA)
    ])
  }
})
