import { BarChart3 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../app/AppStore'
import { InsightRangeTabs } from '../components/InsightRangeTabs'
import { CoOccurrenceMatrix } from '../components/CoOccurrenceMatrix'
import { HabitPerformanceList, type HabitSort } from '../components/HabitPerformanceList'
import { InsightSummaryCards, type InsightSummaryMetric } from '../components/InsightSummaryCards'
import { InsightTrendChart } from '../components/InsightTrendChart'
import { InsightDetailContent, detailTitle, type InsightSelection } from '../components/InsightDetailContent'
import { Modal } from '../components/Modal'
import { buildHabitTrend, buildInsightReport } from '../domain/insights'
import { buildCoOccurrenceReport } from '../domain/coOccurrence'
import type { CoOccurrenceView, InsightRange } from '../domain/insightTypes'

function shortDate(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}月${Number(day)}日`
}

export function InsightsPage() {
  const { store, today } = useAppStore()
  const [range, setRange] = useState<InsightRange>(30)
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [coView, setCoView] = useState<CoOccurrenceView>('bothComplete')
  const [habitSort, setHabitSort] = useState<HabitSort>('attention')
  const [selection, setSelection] = useState<InsightSelection | null>(null)
  const report = useMemo(
    () => (store ? buildInsightReport(store, today, range) : null),
    [store, today, range]
  )
  const selectedHabit = report?.habits.find((habit) => habit.habitId === selectedHabitId) ?? null
  const coOccurrence = useMemo(
    () => (store ? buildCoOccurrenceReport(store, today, range) : null),
    [store, today, range]
  )
  const selectedSeries = selectedHabit
    ? buildHabitTrend(store!, today, range, selectedHabit.habitId)
    : []
  const selectedPair = selection?.kind === 'pair'
    ? coOccurrence?.pairs.find(
        (pair) =>
          (pair.habitAId === selection.habitAId && pair.habitBId === selection.habitBId) ||
          (pair.habitAId === selection.habitBId && pair.habitBId === selection.habitAId)
      ) ?? null
    : null

  useEffect(() => {
    if (selectedHabitId && !store?.habits.some((habit) => habit.id === selectedHabitId && habit.archivedOn === null)) {
      setSelectedHabitId(null)
      setSelection(null)
    }
  }, [selectedHabitId, store])

  useEffect(() => {
    if (!selection || !store) return
    const habitIds = selection.kind === 'habit'
      ? [selection.habitId]
      : selection.kind === 'pair'
        ? [selection.habitAId, selection.habitBId]
        : []
    if (
      habitIds.some((habitId) => !store.habits.some((habit) => habit.id === habitId && habit.archivedOn === null)) ||
      (selection.kind === 'pair' && !selectedPair)
    ) setSelection(null)
  }, [selection, store, selectedPair])

  if (!store || !report) return null

  const leadingPairText = coOccurrence?.leadingPair
    ? `${coOccurrence.leadingPair.habitAName}与${coOccurrence.leadingPair.habitBName}${
        coOccurrence.leadingPair.dominantView === 'bothComplete'
          ? '经常同时达标'
          : coOccurrence.leadingPair.dominantView === 'bothIncomplete'
            ? '经常同时未达标'
            : '经常表现相反'
      }（共同有效日期 ${coOccurrence.leadingPair.commonDays} 天，${coOccurrence.leadingPair.dominantRate}%；可排序样本（≥14 天））。伴随关系不代表因果。`
    : '继续记录更多共同有效日期后，才会形成可排序的本期线索。'

  const selectSummaryMetric = (metric: InsightSummaryMetric) => {
    if (metric === 'bestHabit') setSelectedHabitId(report.bestHabit?.habitId ?? null)
    if (metric === 'attentionHabit') setSelectedHabitId(report.attentionHabit?.habitId ?? null)
    if (metric === 'overall' || metric === 'plannedDays') setSelectedHabitId(null)
    setSelection({ kind: 'summary', metric })
  }

  const selectHabit = (habitId: string) => {
    setSelectedHabitId(habitId)
    setSelection({ kind: 'habit', habitId })
  }

  return (
    <div className="insights-page page-enter">
      <section className="primary-panel insights-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">INSIGHTS</span>
            <h1>看见习惯如何一起变化</h1>
            <p>截至 {shortDate(report.window.end)} · {store.habits.length} 个习惯 · 最近 {range} 天</p>
          </div>
          {store.habits.length > 0 && <InsightRangeTabs value={range} onChange={setRange} />}
        </div>
        {store.habits.length === 0 && (
          <div className="empty-state insights-empty">
            <span className="empty-mark"><BarChart3 size={22} /></span>
            <h2>创建第一个习惯后，这里会开始积累趋势</h2>
            <p>洞察只使用你的真实记录，不会生成示例结论。</p>
            <Link className="button primary" to="/manage">前往管理</Link>
          </div>
        )}
        {store.habits.length > 0 && report.plannedTotal === 0 && (
          <div className="empty-state insights-empty">
            <span className="empty-mark"><BarChart3 size={22} /></span>
            <h2>完成第一个完整记录日后生成洞察</h2>
          </div>
        )}
        {store.habits.length > 0 && report.plannedTotal > 0 && (
          <>
            <InsightSummaryCards report={report} onSelect={selectSummaryMetric} />
            <InsightTrendChart
              range={range}
              overall={report.series}
              selectedHabitName={selectedHabit?.name ?? null}
              selectedHabit={selectedSeries}
              onSelectDate={(start) => {
                const point = report.series.find((item) => item.start === start)
                if (!point) return
                setSelectedDate(point.start === point.end ? point.start : `${point.start} 至 ${point.end}`)
                setSelection({ kind: 'date', start: point.start, end: point.end })
              }}
            />
            {coOccurrence && (
              <>
                <section aria-label="本期线索">
                  <h2>本期线索</h2>
                  <p>{leadingPairText}</p>
                </section>
                <CoOccurrenceMatrix
                  habits={report.habits}
                  pairs={coOccurrence.pairs}
                  view={coView}
                  onViewChange={setCoView}
                  onSelectPair={(pair) => {
                    setSelectedHabitId(pair.habitAId)
                    setSelection({ kind: 'pair', habitAId: pair.habitAId, habitBId: pair.habitBId })
                  }}
                />
              </>
            )}
            <HabitPerformanceList
              habits={report.habits}
              selectedHabitId={selectedHabitId}
              sort={habitSort}
              onSortChange={setHabitSort}
              onSelectHabit={selectHabit}
            />
            <p className="visually-hidden" role="status" aria-live="polite">
              已切换到 {range} 天洞察，共 {report.plannedDays} 个有效计划日{selectedDate ? `，已选择 ${selectedDate}` : ''}
            </p>
          </>
        )}
      </section>
      {selection && (selection.kind !== 'pair' || selectedPair) && (
        <Modal title={detailTitle(selection, report, selectedPair)} variant="sheet" onClose={() => setSelection(null)}>
          <InsightDetailContent selection={selection} report={report} store={store} onSelectHabit={selectHabit} pair={selectedPair} />
        </Modal>
      )}
    </div>
  )
}
