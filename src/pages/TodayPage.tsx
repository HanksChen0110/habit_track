import { ArrowRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../app/AppStore'
import { HabitForm } from '../components/HabitForm'
import { HabitRow } from '../components/HabitRow'
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

  const create = (values: { name: string; targetPerDay: number }) => {
    const saved = commit((current) =>
      createHabit(current, {
        id: crypto.randomUUID(),
        name: values.name,
        targetPerDay: values.targetPerDay,
        today
      })
    )
    if (saved) setShowCreate(false)
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

        <div className="habit-list">
          {activeHabits.length === 0 ? (
            <div className="empty-state">
              <span className="empty-mark"><Plus size={22} /></span>
              <h2>先创建一个每日习惯</h2>
              <p>从一件真正想持续的事开始，目标可以是每天一次或多次。</p>
              <button className="button primary" type="button" onClick={() => setShowCreate(true)}>创建习惯</button>
            </div>
          ) : (
            activeHabits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                count={completionFor(habit.id)}
                onAdjust={(delta) =>
                  commit((current) => adjustCompletion(current, habit.id, selectedDate, delta, today))
                }
              />
            ))
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
        <Modal title="创建习惯" onClose={() => setShowCreate(false)}>
          <HabitForm onSubmit={create} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}
    </div>
  )
}
