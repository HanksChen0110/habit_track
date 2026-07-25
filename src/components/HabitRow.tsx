import { Check, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Habit } from '../domain/types'

export function HabitRow({
  habit,
  count,
  onAdjust,
  disabled = false
}: {
  habit: Habit
  count: number
  onAdjust: (delta: number) => boolean
  disabled?: boolean
}) {
  const completed = count >= habit.targetPerDay
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    []
  )

  const adjust = (delta: number) => {
    setSaveState('saving')
    timerRef.current = window.setTimeout(() => {
      const saved = onAdjust(delta)
      setSaveState(saved ? 'saved' : 'error')
      if (saved) {
        timerRef.current = window.setTimeout(() => setSaveState('idle'), 1000)
      }
    }, 80)
  }

  const detail =
    saveState === 'saving'
      ? '保存中…'
      : saveState === 'saved'
        ? '已保存'
        : saveState === 'error'
          ? '未保存，请重试'
          : completed
            ? '今日目标已完成'
            : `还差 ${habit.targetPerDay - count} 次`

  return (
    <article className={`habit-row ${completed ? 'is-complete' : ''}`} data-testid="habit-row">
      <div className="habit-identity">
        <span className="habit-status" aria-hidden="true">
          {completed ? <Check size={16} /> : <span />}
        </span>
        <div>
          <h3>{habit.name}</h3>
          <p aria-live="polite">{detail}</p>
        </div>
      </div>
      <div className="stepper">
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={disabled || saveState === 'saving' || count === 0}
          aria-label={`${habit.name}，减少一次`}
        >
          <Minus size={17} />
        </button>
        <strong>{count} / {habit.targetPerDay}</strong>
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={disabled || saveState === 'saving' || completed}
          aria-label={`${habit.name}，增加一次`}
        >
          <Plus size={17} />
        </button>
      </div>
    </article>
  )
}
