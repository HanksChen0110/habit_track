import { ArrowRight, Check, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../app/AppStore'
import { HabitForm } from '../components/HabitForm'
import { Modal } from '../components/Modal'
import { parseLocalDate, recentSevenDays } from '../domain/dates'
import { adjustCompletion, createHabit, isHabitActiveOn } from '../domain/store'
import { buildWeeklyReport } from '../domain/weeklyReport'
import { getWeekStart } from '../domain/dates'

const shortDate = (date: string) =>
  parseLocalDate(date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
const weekDay = (date: string) =>
  parseLocalDate(date).toLocaleDateString('zh-CN', { weekday: 'short' }).replace('周', '')

export function TodayPage() {
  const { store, today, commit } = useAppStore()
  const [selectedDate, setSelectedDate] = useState(today)
  const [showCreate, setShowCreate] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [adjustmentFeedback, setAdjustmentFeedback] = useState<{
    key: string
    state: 'saving' | 'saved' | 'error'
  } | null>(null)
  const pendingActionRef = useRef<string | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
    },
    []
  )

  if (!store) return null

  const activeHabits = store.habits.filter((habit) => isHabitActiveOn(habit, selectedDate))
  const completionFor = (habitId: string) =>
    store.completions.find((item) => item.habitId === habitId && item.date === selectedDate)?.count ?? 0
  const planned = activeHabits.reduce((sum, habit) => sum + habit.targetPerDay, 0)
  const actual = activeHabits.reduce((sum, habit) => sum + completionFor(habit.id), 0)
  const rate = planned === 0 ? 0 : Math.round((actual / planned) * 100)
  const dates = recentSevenDays(today)
  const report = useMemo(
    () => buildWeeklyReport(store, getWeekStart(today), today),
    [store, today]
  )

  const create = async (values: { name: string; targetPerDay: number }) => {
    if (pendingActionRef.current !== null) return
    pendingActionRef.current = 'create'
    setPendingAction('create')
    try {
      const saved = await commit((current) =>
        createHabit(current, {
          id: crypto.randomUUID(),
          name: values.name,
          targetPerDay: values.targetPerDay,
          today
        })
      )
      if (saved) setShowCreate(false)
    } catch {
      // AppStore owns the persistent account write error.
    } finally {
      if (pendingActionRef.current === 'create') {
        pendingActionRef.current = null
        setPendingAction(null)
      }
    }
  }

  const adjust = async (habitId: string, delta: number) => {
    if (pendingActionRef.current !== null) return
    const feedbackKey = `${habitId}:${selectedDate}`
    const action = `completion:${feedbackKey}`
    pendingActionRef.current = action
    setPendingAction(action)
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
    setAdjustmentFeedback({ key: feedbackKey, state: 'saving' })

    try {
      const saved = await commit((current) =>
        adjustCompletion(current, habitId, selectedDate, delta, today)
      )
      setAdjustmentFeedback({ key: feedbackKey, state: saved ? 'saved' : 'error' })
      if (saved) {
        feedbackTimerRef.current = window.setTimeout(() => {
          setAdjustmentFeedback((current) =>
            current?.key === feedbackKey && current.state === 'saved' ? null : current
          )
        }, 1000)
      }
    } catch {
      setAdjustmentFeedback({ key: feedbackKey, state: 'error' })
    } finally {
      if (pendingActionRef.current === action) {
        pendingActionRef.current = null
        setPendingAction(null)
      }
    }
  }

  return (
    <div className="today-layout page-enter">
      <section className="primary-panel today-panel">
        <div className="page-heading">
          <div>
            <span className="eyebrow">{selectedDate === today ? '今天' : '修正漏记'}</span>
            <h1>{parseLocalDate(selectedDate).toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}</h1>
          </div>
          <button
            className="button primary compact"
            type="button"
            aria-label="快速创建习惯"
            disabled={pendingAction !== null}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={17} /> 创建习惯
          </button>
        </div>

        <div className="today-progress">
          <div className="progress-number">
            <strong>{actual}</strong><span>/ {planned}</span>
          </div>
          <div>
            <span>今日完成量</span>
            <p>{planned === 0 ? '还没有计划' : rate === 100 ? '今天的计划已完成' : `已完成 ${rate}%`}</p>
          </div>
          <div className="progress-track" aria-label={`完成 ${rate}%`}>
            <span style={{ width: `${rate}%` }} />
          </div>
        </div>

        <div className="section-heading today-section-heading">
          <h2>记录日期</h2>
          <span>可修正最近七天</span>
        </div>
        <div className="date-strip" aria-label="最近七天">
          {dates.map((date) => (
            <button
              key={date}
              className={selectedDate === date ? 'is-selected' : ''}
              type="button"
              onClick={() => setSelectedDate(date)}
              aria-pressed={selectedDate === date}
              aria-label={`${date}${date === today ? '，今天' : '，修正漏记'}`}
            >
              <span>{weekDay(date)}</span>
              <strong>{shortDate(date).split('/').at(-1)}</strong>
              <i />
            </button>
          ))}
        </div>

        <div className="section-heading today-section-heading habit-list-heading">
          <h2>{selectedDate === today ? '今天的计划' : '当日记录'}</h2>
          {activeHabits.length > 0 && <span>{activeHabits.length} 项</span>}
        </div>
        <div className="habit-list">
          {activeHabits.length === 0 ? (
            <div className="empty-state">
              <span className="empty-mark"><Plus size={22} /></span>
              <h2>先创建一个每日习惯</h2>
              <p>从一件真正想持续的事开始，目标可以是每天一次或多次。</p>
              <button className="button primary" type="button" disabled={pendingAction !== null} onClick={() => setShowCreate(true)}>创建习惯</button>
            </div>
          ) : (
            activeHabits.map((habit) => {
              const count = completionFor(habit.id)
              const completed = count >= habit.targetPerDay
              const feedbackKey = `${habit.id}:${selectedDate}`
              const saveState =
                adjustmentFeedback?.key === feedbackKey ? adjustmentFeedback.state : 'idle'
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
                <article
                  className={`habit-row ${completed ? 'is-complete' : ''}`}
                  data-testid="habit-row"
                  key={habit.id}
                >
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
                      onClick={() => void adjust(habit.id, -1)}
                      disabled={pendingAction !== null || count === 0}
                      aria-label={`${habit.name}，减少一次`}
                    >
                      <Minus size={17} />
                    </button>
                    <strong>{count} / {habit.targetPerDay}</strong>
                    <button
                      type="button"
                      onClick={() => void adjust(habit.id, 1)}
                      disabled={pendingAction !== null || completed}
                      aria-label={`${habit.name}，增加一次`}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
        <Link className="button primary full mobile-week-link" to="/week">
          查看本周复盘 <ArrowRight size={17} />
        </Link>
      </section>

      <aside className="summary-panel">
        <span className="eyebrow">本周 · {report.isCurrentWeek ? '进行中' : '已结束'}</span>
        <div className="summary-rate">
          <strong>{report.overallRate ?? '—'}<small>{report.overallRate === null ? '' : '%'}</small></strong>
          <p>截至今天的整体执行率</p>
        </div>
        <dl>
          <div><dt>实际完成</dt><dd>{report.actualTotal}</dd></div>
          <div><dt>计划完成</dt><dd>{report.plannedTotal}</dd></div>
          <div>
            <dt>较上周</dt>
            <dd>{report.deltaPercentagePoints === null ? '暂无' : `${report.deltaPercentagePoints >= 0 ? '+' : ''}${report.deltaPercentagePoints}pp`}</dd>
          </div>
        </dl>
        <Link className="button primary full" to="/week">
          查看本周复盘 <ArrowRight size={17} />
        </Link>
        <p className="summary-note">循迹只呈现执行事实，不评价原因。</p>
      </aside>

      {showCreate && (
        <Modal
          title="创建习惯"
          closeDisabled={pendingAction === 'create'}
          onClose={() => pendingAction !== 'create' && setShowCreate(false)}
        >
          <HabitForm
            saving={pendingAction === 'create'}
            onSubmit={create}
            onCancel={() => pendingAction !== 'create' && setShowCreate(false)}
          />
        </Modal>
      )}
    </div>
  )
}
