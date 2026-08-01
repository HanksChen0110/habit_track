import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { mkdirSync } from 'node:fs'

async function createTestAccount(page: Page, testInfo: TestInfo) {
  const slug = testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 24)
  const email = `e2e-${slug}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.test`
  const password = `E2e-${crypto.randomUUID()}-9aA!`

  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await page.getByRole('button', { name: '创建账号' }).click()
  await expect(page.getByRole('heading', { name: '创建账号' })).toBeVisible()
  await page.getByLabel('邮箱').fill(email)
  await page.getByLabel('密码').fill(password)
  await page.getByRole('button', { name: '创建账号', exact: true }).click()
  await expect(page.getByRole('heading', { name: '让行动留下清晰的轨迹。' })).toBeVisible()

  return email
}

test.beforeEach(async ({ page }, testInfo) => {
  await createTestAccount(page, testInfo)
})

test('empty start, create, record and refresh recovery', async ({ page }) => {
  await page.getByRole('button', { name: '开始记录' }).click()
  await expect(page.getByText('本机账号数据')).toBeVisible()
  await expect(page.getByLabel(/当前账号：e2e-/)).toBeVisible()
  await page.getByRole('button', { name: '创建习惯', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '创建习惯' })
  await expect(dialog.getByRole('button', { name: '关闭创建习惯' })).toBeFocused()
  await dialog.getByLabel('习惯名称').fill('阅读')
  await dialog.getByLabel('每日目标').fill('2')
  await dialog.getByRole('button', { name: '保存习惯' }).click()

  await page.getByRole('button', { name: '快速创建习惯' }).click()
  const secondDialog = page.getByRole('dialog', { name: '创建习惯' })
  await secondDialog.getByLabel('习惯名称').fill('喝水')
  await secondDialog.getByRole('button', { name: '保存习惯' }).click()

  const row = page.getByTestId('habit-row').filter({ hasText: '阅读' })
  await row.getByRole('button', { name: '阅读，增加一次' }).click()
  await expect(row.getByText('1 / 2')).toBeVisible()
  await expect(row.getByText('已保存')).toHaveAttribute('aria-live', 'polite')
  const oneTargetRow = page.getByTestId('habit-row').filter({ hasText: '喝水' })
  await oneTargetRow.getByRole('button', { name: '喝水，增加一次' }).click()
  await expect(oneTargetRow.getByText('1 / 1')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('habit-row').filter({ hasText: '阅读' }).getByText('1 / 2')).toBeVisible()
  await expect(page.getByTestId('habit-row').filter({ hasText: '喝水' }).getByText('1 / 1')).toBeVisible()
})

test('demo, backfill, weekly history and archive remain usable', async ({ page }) => {
  await page.getByRole('button', { name: '载入示例' }).click()
  const dateButtons = page.locator('.date-strip button')
  await expect(dateButtons).toHaveCount(7)
  const availableDates = await dateButtons.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')?.split('，')[0])
  )
  const expectedDates = await page.evaluate(() =>
    Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() + index - 6)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${date.getFullYear()}-${month}-${day}`
    })
  )
  expect(availableDates).toEqual(expectedDates)

  const historicalDate = dateButtons.nth(5)
  await historicalDate.click()
  await expect(page.getByText('修正漏记')).toBeVisible()

  const firstRow = page.getByTestId('habit-row').first()
  const plus = firstRow.getByRole('button', { name: /增加一次/ })
  if (await plus.isEnabled()) {
    await plus.click()
  } else {
    await firstRow.getByRole('button', { name: /减少一次/ }).click()
  }

  await page.getByRole('link', { name: '本周', exact: true }).filter({ visible: true }).click()
  await expect(page.getByTestId('week-chart')).toBeVisible()
  await page.getByRole('button', { name: '上一周' }).click()
  await expect(page.getByRole('button', { name: '下一周' })).toBeEnabled()

  await page.getByRole('link', { name: '管理' }).filter({ visible: true }).click()
  await page.getByRole('button', { name: '归档阅读 30 分钟' }).click()
  await expect(page.getByText(/在今天仍计入计划/)).toBeVisible()
  await page.getByRole('button', { name: '确认归档' }).click()
  await expect(page.getByText(/归档于.*历史数据保留/)).toBeVisible()

  await page.getByRole('link', { name: '今天' }).filter({ visible: true }).click()
  await expect(page.getByText('阅读 30 分钟')).toBeVisible()
})

test('invalid import preserves data and valid import replaces it after preview', async ({ page }) => {
  await page.getByRole('button', { name: '载入示例' }).click()
  await page.getByRole('link', { name: '管理' }).filter({ visible: true }).click()
  const input = page.getByLabel('选择 JSON 备份')

  await input.setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken')
  })
  await expect(page.getByRole('alert')).toContainText('无法解析 JSON 文件')
  await expect(page.getByText('阅读 30 分钟')).toBeVisible()

  const today = await page.evaluate(() => {
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
  })
  const tomorrow = await page.evaluate(() => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
  })
  const baseHabit = {
    id: 'valid',
    name: '合法习惯',
    targetPerDay: 1,
    createdOn: today,
    archivedOn: null
  }
  const invalidStores = [
    { version: 2, habits: [], completions: [] },
    { version: 1, habits: [{ ...baseHabit, id: '' }], completions: [] },
    { version: 1, habits: [baseHabit, { ...baseHabit }], completions: [] },
    {
      version: 1,
      habits: [baseHabit],
      completions: [{ habitId: 'missing', date: today, count: 1 }]
    },
    {
      version: 1,
      habits: [baseHabit],
      completions: [
        { habitId: 'valid', date: today, count: 1 },
        { habitId: 'valid', date: today, count: 1 }
      ]
    },
    {
      version: 1,
      habits: [baseHabit],
      completions: [{ habitId: 'valid', date: tomorrow, count: 1 }]
    },
    {
      version: 1,
      habits: [baseHabit],
      completions: [{ habitId: 'valid', date: today, count: 2 }]
    }
  ]

  for (const [index, invalidStore] of invalidStores.entries()) {
    await input.setInputFiles({
      name: `invalid-${index}.json`,
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(invalidStore))
    })
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByText('阅读 30 分钟')).toBeVisible()
  }

  await input.setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        habits: [
          {
            id: 'restored',
            name: '恢复后的习惯',
            targetPerDay: 1,
            createdOn: today,
            archivedOn: null
          }
        ],
        completions: []
      })
    )
  })

  const dialog = page.getByRole('dialog', { name: '确认替换数据' })
  await expect(dialog.getByText('1 项')).toBeVisible()
  await expect(dialog.getByText('0 条')).toBeVisible()
  await dialog.getByRole('button', { name: '完整替换' }).click()
  await expect(page.getByText('恢复后的习惯')).toBeVisible()
  await expect(page.getByText('阅读 30 分钟')).toHaveCount(0)
})

test('exported JSON restores the complete pre-change store', async ({ page }) => {
  await page.getByRole('button', { name: '载入示例' }).click()
  await page.getByRole('link', { name: '管理', exact: true }).filter({ visible: true }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出完整备份' }).click()
  const download = await downloadPromise
  const backupPath = await download.path()
  expect(backupPath).not.toBeNull()

  await page.getByRole('button', { name: '归档阅读 30 分钟' }).click()
  await page.getByRole('button', { name: '确认归档' }).click()
  await expect(page.getByText(/归档于.*历史数据保留/)).toBeVisible()

  await page.getByLabel('选择 JSON 备份').setInputFiles(backupPath!)
  const dialog = page.getByRole('dialog', { name: '确认替换数据' })
  await expect(dialog.getByText('3 项')).toBeVisible()
  await dialog.getByRole('button', { name: '完整替换' }).click()

  await expect(page.getByRole('button', { name: '归档阅读 30 分钟' })).toBeVisible()
  await expect(page.getByText(/归档于.*历史数据保留/)).toHaveCount(0)
})

test('a backend write failure leaves the visible and persisted count unchanged', async ({ page }) => {
  await page.getByRole('button', { name: '载入示例' }).click()
  const row = page.getByTestId('habit-row').filter({ hasText: '阅读 30 分钟' })
  const before = await row.locator('.stepper strong').textContent()
  let blocked = false
  await page.route('**/rest/v1/completions*', async (route) => {
    if (!blocked && route.request().method() !== 'GET') {
      blocked = true
      await route.abort('failed')
      return
    }
    await route.continue()
  })

  const plus = row.getByRole('button', { name: '阅读 30 分钟，增加一次' })
  const minus = row.getByRole('button', { name: '阅读 30 分钟，减少一次' })
  await (await plus.isEnabled() ? plus : minus).click()

  await expect(row.getByText('未保存，请重试')).toBeVisible()
  await expect(row.locator('.stepper strong')).toHaveText(before ?? '')
  await page.unroute('**/rest/v1/completions*')
  await page.reload()
  await expect(page.getByTestId('habit-row').filter({ hasText: '阅读 30 分钟' }).locator('.stepper strong')).toHaveText(before ?? '')
})

test('account controls, modal focus and reduced motion remain accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: '开始记录' }).click()

  const signOut = page.getByRole('button', { name: '退出账号' })
  await expect(signOut).toBeVisible()
  const signOutBox = await signOut.boundingBox()
  expect(signOutBox?.height ?? 0).toBeGreaterThanOrEqual(44)

  const createButton = page.getByRole('button', { name: '创建习惯', exact: true })
  await createButton.focus()
  await createButton.press('Enter')
  const dialog = page.getByRole('dialog', { name: '创建习惯' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: '关闭创建习惯' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(createButton).toBeFocused()

  const motion = await page.locator('.page-enter').first().evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      animationName: style.animationName,
      animationDuration: style.animationDuration,
      transform: style.transform,
      transitionDuration: style.transitionDuration
    }
  })
  expect(motion.animationName).toBe('none')
  expect(motion.transform).toBe('none')
  expect(Number.parseFloat(motion.animationDuration)).toBeLessThanOrEqual(0.001)
  expect(Number.parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.001)
})

test('demo insights support range switching, co-occurrence drill-down and manage focus', async ({ page }) => {
  await page.getByRole('button', { name: '载入示例' }).click()
  await page.getByRole('link', { name: '洞察', exact: true }).filter({ visible: true }).click()

  await expect(page.getByRole('heading', { name: '看见习惯如何一起变化' })).toBeVisible()
  await page.getByRole('button', { name: '7 天', exact: true }).click()
  await expect(page.getByTestId('insight-trend-chart')).toHaveAttribute('data-range', '7')
  await page.getByRole('button', { name: '30 天', exact: true }).click()
  await expect(page.getByTestId('insight-trend-chart')).toHaveAttribute('data-range', '30')
  await page.getByRole('button', { name: '90 天', exact: true }).click()
  await expect(page.getByTestId('insight-trend-chart')).toHaveAttribute('data-range', '90')

  await page.getByRole('button', { name: '30 天', exact: true }).click()
  const pair = page.getByRole('button', { name: /拉伸与训练与阅读 30 分钟，同时达标/ }).first()
  await pair.click()
  const detail = page.getByRole('dialog', { name: /拉伸与训练与阅读 30 分钟/ })
  await expect(detail.getByText('伴随关系不代表因果')).toBeVisible()
  await detail.getByRole('button', { name: /关闭/ }).click()

  await page.getByRole('button', { name: '查看阅读 30 分钟的趋势' }).click()
  await page.getByRole('link', { name: '前往管理' }).click()
  await expect(page.getByTestId('focused-manage-habit')).toContainText('阅读 30 分钟')
})

test('target viewports have no horizontal overflow and expose the correct navigation', async ({
  page
}, testInfo) => {
  const widths = [320, 390, 768, 1024, 1440]
  mkdirSync('output/playwright', { recursive: true })
  await page.getByRole('button', { name: '载入示例' }).click()

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('link', { name: '今天', exact: true }).filter({ visible: true })).toBeVisible()

    if (width < 1024) {
      await expect(page.locator('.mobile-nav')).toBeVisible()
      await expect(page.locator('.mobile-nav a')).toHaveCount(4)
    } else {
      await expect(page.locator('.desktop-nav')).toBeVisible()
      await expect(page.locator('.desktop-nav a')).toHaveCount(4)
      await expect(page.locator('.summary-panel')).toBeVisible()
    }

    await page.getByRole('link', { name: '洞察', exact: true }).filter({ visible: true }).click()
    await expect(page.getByRole('heading', { name: '看见习惯如何一起变化' })).toBeVisible()
    const hasInsightOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasInsightOverflow, `${width}px 洞察页不应出现横向滚动`).toBe(false)

    if (width <= 768) {
      const undersizedTargets = await page.locator('button:visible').evaluateAll((buttons) =>
        buttons.flatMap((button) => {
          const rect = button.getBoundingClientRect()
          return rect.width < 43.5 || rect.height < 43.5
            ? [{
                label: button.getAttribute('aria-label') || button.textContent?.trim(),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }]
            : []
        })
      )
      expect(undersizedTargets, `${width}px 洞察页按钮触控区不得小于 44px`).toEqual([])
    }

    await page.getByRole('link', { name: '本周', exact: true }).filter({ visible: true }).click()
    await expect(page.getByRole('heading', { name: '本周复盘' })).toBeVisible()
    await page.getByRole('link', { name: '管理', exact: true }).filter({ visible: true }).click()
    await expect(page.getByRole('heading', { name: '习惯管理' })).toBeVisible()
    await page.getByRole('link', { name: '今天', exact: true }).filter({ visible: true }).click()

    if (width === 390 || width === 1440) {
      await page.screenshot({
        path: `output/playwright/${testInfo.project.name}-${width}-today.png`,
        fullPage: true,
        animations: 'disabled'
      })
      await page.getByRole('link', { name: '洞察', exact: true }).filter({ visible: true }).click()
      await expect(page.getByRole('heading', { name: '看见习惯如何一起变化' })).toBeVisible()
      await page.screenshot({
        path: `output/playwright/${testInfo.project.name}-${width}-insights.png`,
        fullPage: true,
        animations: 'disabled'
      })
      await page.getByRole('link', { name: '本周', exact: true }).filter({ visible: true }).click()
      await expect(page.getByRole('heading', { name: '本周复盘' })).toBeVisible()
      await page.screenshot({
        path: `output/playwright/${testInfo.project.name}-${width}-week.png`,
        fullPage: true,
        animations: 'disabled'
      })
      await page.getByRole('link', { name: '管理', exact: true }).filter({ visible: true }).click()
      await expect(page.getByRole('heading', { name: '习惯管理' })).toBeVisible()
      await page.screenshot({
        path: `output/playwright/${testInfo.project.name}-${width}-manage.png`,
        fullPage: true,
        animations: 'disabled'
      })
    }
  }
})

test('installed app shell remains available offline', async ({ page, context }) => {
  await page.getByRole('button', { name: '载入示例' }).click()
  await page.waitForFunction(async () => Boolean(await navigator.serviceWorker?.ready))
  await page.reload()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('循迹', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /正在读取账号数据|暂时无法读取账号数据/ })).toBeVisible()
  await expect(page.getByText('阅读 30 分钟')).toHaveCount(0)
  await context.setOffline(false)
})
