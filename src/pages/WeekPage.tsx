import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../app/AppStore'
import { addDays, getWeekStart, parseLocalDate } from '../domain/dates'
import { buildWeeklyReport } from '../domain/weeklyReport'

const dayLabel = (date: string) =>
  parseLocalDate(date).toLocaleDateString('zh-CN', { weekday: 'short' })
const dateLabel = (date: string) =>
  parseLocalDate(date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })

export function WeekPage() {
  const { store, today } = useAppStore()
  const currentWeek = getWeekStart(today)
  const [weekStart, setWeekStart] = useState(currentWeek)
  if (!store) return null
  const report = buildWeeklyReport(store, weekStart, today)

  const patternLabel = (dates: string[]) =>
    dates.length === 0 ? '数据不足' : dates.map(dayLabel).join('、')

  return (
    <div className="week-page page-enter">
      <section className="primary-panel week-hero">
        <div className="page-heading">
          <div>
            <span className="eyebrow">每周回看执行事实</span>
            <h1>本周复盘</h1>
          </div>
          <div className="week-switcher">
            <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="上一周">
              <ChevronLeft size={18} />
            </button>
            <span>
              {dateLabel(weekStart)} – {dateLabel(report.weekEnd)}
              {report.isCurrentWeek && <small>截至今天 · 进行中</small>}
            </span>
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              disabled={weekStart === currentWeek}
              aria-label="下一周"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {report.overallRate === null ? (
          <div className="empty-state week-empty">
            <h2>本周暂无可复盘的数据</h2>
            <p>这一周还没有有效的每日计划。</p>
          </div>
        ) : (
          <>
            <div className="week-overview">
              <div className="big-rate">
                <span>整体执行率</span>
                <strong>{report.overallRate}<small>%</small></strong>
              </div>
              <div className={`delta-card ${(report.deltaPercentagePoints ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                {(report.deltaPercentagePoints ?? 0) >= 0 ? <TrendingUp size={21} /> : <TrendingDown size={21} />}
                <span>较紧邻上一周</span>
                <strong>
                  {report.deltaPercentagePoints === null
                    ? '暂无比较'
                    : `${report.deltaPercentagePoints >= 0 ? '+' : ''}${report.deltaPercentagePoints}pp`}
                </strong>
              </div>
            </div>

            <div className="week-chart" data-testid="week-chart" aria-label="每日执行率">
              {report.days.map((day) => (
                <div className="chart-day" key={day.date}>
                  <div className="bar-track">
                    {day.rate === null ? (
                      <span className="no-plan">无计划</span>
                    ) : (
                      <span className="bar-fill" style={{ height: `${Math.max(day.rate, 7)}%` }}>
                        <b>{day.rate}%</b>
                      </span>
                    )}
                  </div>
                  <strong>{dayLabel(day.date)}</strong>
                  <small>{dateLabel(day.date)}</small>
                </div>
              ))}
            </div>

            <div className="pattern-summary">
              <div>
                <span>执行最好</span>
                <strong>{patternLabel(report.bestDates)}</strong>
                <small>仅按当日执行率判断</small>
              </div>
              <div>
                <span>需要留意</span>
                <strong>{patternLabel(report.worstDates)}</strong>
                <small>不推断未完成原因</small>
              </div>
              <div>
                <span>完成单位</span>
                <strong>{report.actualTotal} / {report.plannedTotal}</strong>
                <small>部分完成也计入</small>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
