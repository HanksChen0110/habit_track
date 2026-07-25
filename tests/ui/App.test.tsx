import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'

describe('循迹交互原型', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    window.location.hash = ''
  })

  it('starts empty and lets the user create and record a habit', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '开始记录' }))
    expect(screen.getByText('先创建一个每日习惯')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '创建习惯' }))
    const dialog = screen.getByRole('dialog', { name: '创建习惯' })
    await user.type(within(dialog).getByLabelText('习惯名称'), '阅读')
    await user.clear(within(dialog).getByLabelText('每日目标'))
    await user.type(within(dialog).getByLabelText('每日目标'), '1')
    await user.click(within(dialog).getByRole('button', { name: '保存习惯' }))

    const row = screen.getByTestId('habit-row')
    expect(within(row).getByText('阅读')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: '阅读，增加一次' }))
    expect(within(row).getByText('保存中…')).toBeInTheDocument()
    expect(await within(row).findByText('1 / 1')).toBeInTheDocument()
    expect(within(row).getByText('已保存')).toBeInTheDocument()
  })

  it('shows inline validation without creating invalid habits', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '开始记录' }))
    await user.click(screen.getByRole('button', { name: '创建习惯' }))
    await user.click(screen.getByRole('button', { name: '保存习惯' }))

    expect(screen.getByText('请输入习惯名称')).toBeInTheDocument()
    expect(screen.queryByTestId('habit-row')).not.toBeInTheDocument()
  })

  it('keeps the persisted count when saving an adjustment fails', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '开始记录' }))
    await user.click(screen.getByRole('button', { name: /^创建习惯$/ }))
    const dialog = screen.getByRole('dialog', { name: '创建习惯' })
    await user.type(within(dialog).getByLabelText('习惯名称'), '阅读')
    await user.click(within(dialog).getByRole('button', { name: '保存习惯' }))

    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('storage unavailable')
    })
    const row = screen.getByTestId('habit-row')
    await user.click(within(row).getByRole('button', { name: '阅读，增加一次' }))

    expect(await within(row).findByText('未保存，请重试')).toBeInTheDocument()
    expect(within(row).getByText('0 / 1')).toBeInTheDocument()
  })

  it('loads demo data and reaches a populated weekly review', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '载入示例' }))
    expect(screen.getAllByTestId('habit-row')).toHaveLength(3)

    await user.click(screen.getByRole('link', { name: '洞察' }))
    expect(screen.getByRole('heading', { name: '看见习惯如何一起变化' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '本周' }))
    expect(screen.getByRole('heading', { name: '本周复盘' })).toBeInTheDocument()
    expect(screen.getByText('整体执行率')).toBeInTheDocument()
    expect(screen.getByTestId('week-chart')).toBeInTheDocument()
  })

  it('does not treat corrupted local data as a new empty account', () => {
    localStorage.setItem('xunji.store.v1', '{broken')
    render(<App />)

    expect(screen.getByRole('heading', { name: '本地数据需要恢复' })).toBeInTheDocument()
    expect(screen.getByText(/没有清空或覆盖原数据/)).toBeInTheDocument()
  })

  it('explains locked targets and keeps an archived habit valid for today', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '载入示例' }))
    await user.click(screen.getByRole('link', { name: '管理' }))

    await user.click(screen.getByRole('button', { name: '编辑阅读 30 分钟' }))
    const editDialog = screen.getByRole('dialog', { name: '编辑习惯' })
    expect(within(editDialog).getByLabelText('每日目标')).toBeDisabled()
    expect(within(editDialog).getByText(/目标已进入历史统计/)).toBeInTheDocument()
    await user.click(within(editDialog).getByRole('button', { name: '取消' }))

    await user.click(screen.getByRole('button', { name: '归档阅读 30 分钟' }))
    const archiveDialog = screen.getByRole('dialog', { name: '归档习惯' })
    expect(within(archiveDialog).getByText(/在今天仍计入计划/)).toBeInTheDocument()
    await user.click(within(archiveDialog).getByRole('button', { name: '确认归档' }))

    expect(screen.getByText(/归档于.*历史数据保留/)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '今天' }))
    expect(screen.getByText('阅读 30 分钟')).toBeInTheDocument()
  })

  it('focuses the requested habit on manage without opening its editor', () => {
    localStorage.setItem('xunji.store.v1', JSON.stringify({
      version: 1,
      habits: [{ id: 'read', name: '阅读', targetPerDay: 1, createdOn: '2026-07-01', archivedOn: null }],
      completions: []
    }))
    window.location.hash = '#/manage?habit=read'

    render(<App />)

    expect(screen.getByTestId('focused-manage-habit')).toHaveTextContent('阅读')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('focuses an archived requested habit without opening its editor', () => {
    localStorage.setItem('xunji.store.v1', JSON.stringify({
      version: 1,
      habits: [{ id: 'read', name: '阅读', targetPerDay: 1, createdOn: '2026-07-01', archivedOn: '2026-07-24' }],
      completions: []
    }))
    window.location.hash = '#/manage?habit=read'

    render(<App />)

    expect(screen.getByTestId('focused-manage-habit')).toHaveTextContent('阅读')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps standard modal Escape, focus wrapping and focus restoration', async () => {
    const user = userEvent.setup()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '开始记录' }))
    const trigger = screen.getByRole('button', { name: '创建习惯' })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: '创建习惯' })
    const closeButton = within(dialog).getByRole('button', { name: '关闭创建习惯' })
    const saveButton = within(dialog).getByRole('button', { name: '保存习惯' })
    closeButton.focus()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(saveButton)
    await user.tab()
    expect(document.activeElement).toBe(closeButton)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it('previews valid imports and rejects invalid files without replacing data', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '载入示例' }))
    await user.click(screen.getByRole('link', { name: '管理' }))

    const input = screen.getByLabelText('选择 JSON 备份')
    await user.upload(input, new File(['{broken'], 'broken.json', { type: 'application/json' }))
    expect(screen.getByRole('alert')).toHaveTextContent('无法解析 JSON 文件')
    expect(screen.getByText('阅读 30 分钟')).toBeInTheDocument()

    const backup = {
      version: 1,
      habits: [
        {
          id: 'imported-habit',
          name: '导入后的习惯',
          targetPerDay: 1,
          createdOn: new Date().toLocaleDateString('sv-SE'),
          archivedOn: null
        }
      ],
      completions: []
    }
    const backupFile = new File([JSON.stringify(backup)], 'backup.json', {
      type: 'application/json'
    })
    await user.upload(input, backupFile)

    let importDialog = screen.getByRole('dialog', { name: '确认替换数据' })
    expect(within(importDialog).getByText('1 项')).toBeInTheDocument()
    expect(within(importDialog).getByText('0 条')).toBeInTheDocument()
    await user.click(within(importDialog).getByRole('button', { name: '取消' }))
    expect(screen.getByText('阅读 30 分钟')).toBeInTheDocument()

    await user.upload(input, backupFile)
    importDialog = screen.getByRole('dialog', { name: '确认替换数据' })
    await user.click(within(importDialog).getByRole('button', { name: '完整替换' }))
    expect(screen.getByText('导入后的习惯')).toBeInTheDocument()
    expect(screen.queryByText('阅读 30 分钟')).not.toBeInTheDocument()
  })
})
