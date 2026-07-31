import { useState, type FormEvent } from 'react'
import type { Habit } from '../domain/types'

export function HabitForm({
  habit,
  targetLocked = false,
  saving = false,
  onSubmit,
  onCancel
}: {
  habit?: Habit
  targetLocked?: boolean
  saving?: boolean
  onSubmit: (values: { name: string; targetPerDay: number }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(habit?.name ?? '')
  const [target, setTarget] = useState(String(habit?.targetPerDay ?? 1))
  const [nameError, setNameError] = useState('')
  const [targetError, setTargetError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    const parsedTarget = Number(target)
    const nextNameError = name.trim() ? '' : '请输入习惯名称'
    const nextTargetError =
      Number.isInteger(parsedTarget) && parsedTarget > 0 ? '' : '每日目标必须是大于 0 的整数'
    setNameError(nextNameError)
    setTargetError(nextTargetError)
    if (nextNameError || nextTargetError) return
    onSubmit({ name: name.trim(), targetPerDay: parsedTarget })
  }

  return (
    <form className="stack-form" aria-busy={saving} onSubmit={submit}>
      <label htmlFor="habit-name">
        <span>习惯名称</span>
        <input
          id="habit-name"
          autoFocus
          disabled={saving}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? 'habit-name-error' : undefined}
          placeholder="例如：阅读 30 分钟"
        />
      </label>
      {nameError && <p className="field-error" id="habit-name-error" role="alert">{nameError}</p>}
      <label htmlFor="habit-target"><span>每日目标</span></label>
      <div className="target-input">
        <input
          id="habit-target"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={target}
          disabled={targetLocked || saving}
          onChange={(event) => setTarget(event.target.value)}
          aria-invalid={Boolean(targetError)}
          aria-describedby={targetError ? 'habit-target-error' : targetLocked ? 'habit-target-lock' : undefined}
        />
        <span>次 / 天</span>
      </div>
      {targetError && <p className="field-error" id="habit-target-error" role="alert">{targetError}</p>}
      {targetLocked && (
        <p className="helper-text" id="habit-target-lock">
          该目标已进入历史统计。若要更改，请归档旧习惯后新建。
        </p>
      )}
      {saving ? (
        <p className="helper-text" role="status" aria-live="polite">
          正在保存习惯…
        </p>
      ) : null}
      <div className="form-actions">
        <button className="button secondary" type="button" disabled={saving} onClick={onCancel}>取消</button>
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存习惯'}
        </button>
      </div>
    </form>
  )
}
