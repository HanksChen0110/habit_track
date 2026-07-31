import { Archive, Download, FileJson, Pencil, Plus, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore, type ImportPreview } from '../app/AppStore'
import { HabitForm } from '../components/HabitForm'
import { Modal } from '../components/Modal'
import { archiveHabit, createHabit, editHabit } from '../domain/store'
import type { Habit } from '../domain/types'

export function ManagePage() {
  const {
    store,
    today,
    commit,
    exportJson,
    previewImport,
    confirmImport
  } = useAppStore()
  const [formMode, setFormMode] = useState<'create' | Habit | null>(null)
  const [archiveCandidate, setArchiveCandidate] = useState<Habit | null>(null)
  const [importCandidate, setImportCandidate] = useState<ImportPreview | null>(null)
  const [importError, setImportError] = useState('')
  const [pendingAction, setPendingAction] = useState<'habit' | 'archive' | 'import' | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const focusedRowRef = useRef<HTMLElement>(null)
  const [searchParams] = useSearchParams()
  const focusedHabitId = searchParams.get('habit')
  if (!store) return null

  const active = store.habits.filter((habit) => habit.archivedOn === null)
  const archived = store.habits.filter((habit) => habit.archivedOn !== null)

  useEffect(() => {
    focusedRowRef.current?.scrollIntoView?.({ block: 'center' })
    focusedRowRef.current?.focus()
  }, [focusedHabitId])

  const saveHabit = async (values: { name: string; targetPerDay: number }) => {
    if (!formMode || pendingAction !== null) return
    setPendingAction('habit')
    try {
      const saved =
        formMode === 'create'
          ? await commit((current) =>
              createHabit(current, {
                id: crypto.randomUUID(),
                name: values.name,
                targetPerDay: values.targetPerDay,
                today
              })
            )
          : await commit((current) => editHabit(current, formMode.id, values, today))
      if (saved) setFormMode(null)
    } catch {
      // AppStore owns the persistent account write error.
    } finally {
      setPendingAction(null)
    }
  }

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `xunji-backup-${today}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const archiveSelectedHabit = async () => {
    if (!archiveCandidate || pendingAction !== null) return
    setPendingAction('archive')
    try {
      const saved = await commit(
        (current) => archiveHabit(current, archiveCandidate.id, today),
        '已归档'
      )
      if (saved) setArchiveCandidate(null)
    } catch {
      // AppStore owns the persistent account write error.
    } finally {
      setPendingAction(null)
    }
  }

  const chooseImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setImportError('')
      setImportCandidate(previewImport(await file.text()))
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入文件无效')
    } finally {
      event.target.value = ''
    }
  }

  const replaceWithImport = async () => {
    if (!importCandidate || pendingAction !== null) return
    setPendingAction('import')
    try {
      if (await confirmImport(importCandidate)) setImportCandidate(null)
    } catch {
      // AppStore owns the persistent account write error.
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="manage-layout page-enter">
      <section className="primary-panel manage-panel">
        <div className="page-heading">
          <div>
            <span className="eyebrow">保持计划清晰</span>
            <h1>习惯管理</h1>
          </div>
          <button className="button primary compact" type="button" onClick={() => setFormMode('create')}>
            <Plus size={17} /> 创建习惯
          </button>
        </div>

        <div className="manage-section">
          <div className="section-label"><h2>进行中</h2><span>{active.length} 项</span></div>
          {active.length === 0 ? (
            <p className="quiet-empty">还没有进行中的习惯。</p>
          ) : (
            <div className="manage-list">
              {active.map((habit) => (
                <article className={`manage-row ${focusedHabitId === habit.id ? 'is-focused' : ''}`} key={habit.id} data-testid={focusedHabitId === habit.id ? 'focused-manage-habit' : undefined} tabIndex={focusedHabitId === habit.id ? -1 : undefined} ref={focusedHabitId === habit.id ? focusedRowRef : undefined}>
                  <div>
                    <h3>{habit.name}</h3>
                    <p>每天 {habit.targetPerDay} 次 · 创建于 {habit.createdOn}</p>
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={() => setFormMode(habit)} aria-label={`编辑${habit.name}`}>
                      <Pencil size={17} /> 编辑
                    </button>
                    <button type="button" onClick={() => setArchiveCandidate(habit)} aria-label={`归档${habit.name}`}>
                      <Archive size={17} /> 归档
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {archived.length > 0 && (
          <div className="manage-section archived-section">
            <div className="section-label"><h2>已归档</h2><span>{archived.length} 项</span></div>
            <div className="manage-list">
              {archived.map((habit) => (
                <article className={`manage-row is-archived ${focusedHabitId === habit.id ? 'is-focused' : ''}`} key={habit.id} data-testid={focusedHabitId === habit.id ? 'focused-manage-habit' : undefined} tabIndex={focusedHabitId === habit.id ? -1 : undefined} ref={focusedHabitId === habit.id ? focusedRowRef : undefined}>
                  <div><h3>{habit.name}</h3><p>归档于 {habit.archivedOn} · 历史数据保留</p></div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="data-panel">
        <FileJson size={22} />
        <span className="eyebrow">本地数据</span>
        <h2>备份与迁移</h2>
        <p>这里管理当前账号的本机数据，可导出完整 JSON 备份。</p>
        <button className="button primary full" type="button" onClick={download}>
          <Download size={17} /> 导出完整备份
        </button>
        <button className="button secondary full" type="button" onClick={() => fileInput.current?.click()}>
          <Upload size={17} /> 导入 JSON
        </button>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="选择 JSON 备份"
          onChange={chooseImport}
        />
        {importError && <p className="import-error" role="alert">{importError}</p>}
        <small>导入会先校验，确认后才完整替换当前账号的本机数据库数据。</small>
      </aside>

      {formMode && (
        <Modal
          title={formMode === 'create' ? '创建习惯' : '编辑习惯'}
          closeDisabled={pendingAction === 'habit'}
          onClose={() => pendingAction !== 'habit' && setFormMode(null)}
        >
          <HabitForm
            habit={formMode === 'create' ? undefined : formMode}
            targetLocked={
              formMode !== 'create' &&
              (formMode.createdOn !== today ||
                store.completions.some((item) => item.habitId === formMode.id))
            }
            saving={pendingAction === 'habit'}
            onSubmit={saveHabit}
            onCancel={() => setFormMode(null)}
          />
        </Modal>
      )}

      {archiveCandidate && (
        <Modal
          title="归档习惯"
          closeDisabled={pendingAction === 'archive'}
          onClose={() => pendingAction !== 'archive' && setArchiveCandidate(null)}
        >
          <div className="confirm-copy">
            <p>归档“{archiveCandidate.name}”后，它在今天仍计入计划，从明天起不再出现。</p>
            <p className="helper-text">所有历史记录和周报都会保留。</p>
          </div>
          <div className="form-actions">
            <button className="button secondary" type="button" disabled={pendingAction === 'archive'} onClick={() => setArchiveCandidate(null)}>取消</button>
            <button
              className="button danger"
              type="button"
              disabled={pendingAction === 'archive'}
              onClick={() => void archiveSelectedHabit()}
            >
              {pendingAction === 'archive' ? '归档中…' : '确认归档'}
            </button>
          </div>
        </Modal>
      )}

      {importCandidate && (
        <Modal
          title="确认替换数据"
          closeDisabled={pendingAction === 'import'}
          onClose={() => pendingAction !== 'import' && setImportCandidate(null)}
        >
          <div className="import-preview">
            <p>
              文件已通过完整校验。这份完整 JSON 备份只会替换当前账号本机数据库中的全部习惯与完成记录；替换失败时，原数据不会被覆盖。
            </p>
            <dl>
              <div><dt>习惯</dt><dd>{importCandidate.habitCount} 项</dd></div>
              <div><dt>完成记录</dt><dd>{importCandidate.completionCount} 条</dd></div>
            </dl>
          </div>
          <div className="form-actions">
            <button className="button secondary" type="button" disabled={pendingAction === 'import'} onClick={() => setImportCandidate(null)}>取消</button>
            <button
              className="button danger"
              type="button"
              disabled={pendingAction === 'import'}
              onClick={() => void replaceWithImport()}
            >
              {pendingAction === 'import' ? '替换中…' : '完整替换'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
