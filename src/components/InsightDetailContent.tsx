import { Link } from 'react-router-dom'
import type { InsightSummaryMetric } from './InsightSummaryCards'
import { isHabitActiveOn } from '../domain/store'
import { addDays } from '../domain/dates'
import type { CoOccurrencePair, InsightReport } from '../domain/insightTypes'
import type { Store } from '../domain/types'

export type InsightSelection =
  | { kind: 'summary'; metric: InsightSummaryMetric }
  | { kind: 'date'; start: string; end: string }
  | { kind: 'habit'; habitId: string }
  | { kind: 'pair'; habitAId: string; habitBId: string }

function period(start: string, end: string) {
  return `${start} 至 ${end}`
}

function changeText(value: number | null) {
  return value === null ? '暂无可比周期' : `较上一周期 ${value >= 0 ? '+' : ''}${value} 个百分点`
}

export function detailTitle(selection: InsightSelection, report: InsightReport, pair?: CoOccurrencePair | null) {
  if (selection.kind === 'summary') {
    return selection.metric === 'overall' ? '整体执行率详情' : selection.metric === 'plannedDays' ? '有计划天数详情' : selection.metric === 'bestHabit' ? '最佳习惯详情' : '需关注详情'
  }
  if (selection.kind === 'date') return `${selection.start === selection.end ? selection.start : period(selection.start, selection.end)} 详情`
  if (selection.kind === 'habit') return report.habits.find((habit) => habit.habitId === selection.habitId)?.name ?? '习惯详情'
  return pair ? `${pair.habitAName}与${pair.habitBName}详情` : '习惯共现详情'
}

export function InsightDetailContent({
  selection,
  report,
  store,
  onSelectHabit,
  pair
}: {
  selection: InsightSelection
  report: InsightReport
  store: Store
  onSelectHabit: (habitId: string) => void
  pair?: CoOccurrencePair | null
}) {
  if (selection.kind === 'summary') {
    const isDays = selection.metric === 'plannedDays'
    const highlighted = selection.metric === 'bestHabit' ? report.bestHabit : selection.metric === 'attentionHabit' ? report.attentionHabit : null
    return (
      <div className="detail-content">
        <p>{isDays ? '有计划天数 = 当天至少有一个有效习惯的日期数。' : '执行率 = 实际完成量 ÷ 目标量 × 100%。'}</p>
        <dl>
          <div><dt>当前值</dt><dd>{highlighted ? `${highlighted.rate ?? '—'}%` : isDays ? `${report.plannedDays} 天` : `${report.overallRate ?? '—'}%`}</dd></div>
          <div><dt>实际 / 目标</dt><dd>{highlighted ? `${highlighted.actual} / ${highlighted.planned}` : `${report.actualTotal} / ${report.plannedTotal}`}</dd></div>
          <div><dt>比较窗口</dt><dd>{period(report.window.previousStart, report.window.previousEnd)}；{changeText(highlighted?.deltaPercentagePoints ?? report.deltaPercentagePoints)}</dd></div>
        </dl>
        {highlighted && <button className="button secondary" type="button" onClick={() => onSelectHabit(highlighted.habitId)}>查看{highlighted.name}</button>}
      </div>
    )
  }

  if (selection.kind === 'date') {
    const dates: string[] = []
    for (let date = selection.start; date <= selection.end; date = addDays(date, 1)) dates.push(date)
    const totals = store.habits.map((habit) => {
      const activeDates = dates.filter((date) => isHabitActiveOn(habit, date))
      const planned = activeDates.length * habit.targetPerDay
      const actual = activeDates.reduce(
        (sum, date) => sum + Math.min(store.completions.find((item) => item.habitId === habit.id && item.date === date)?.count ?? 0, habit.targetPerDay),
        0
      )
      return { habit, actual, planned }
    }).filter((item) => item.planned > 0)
    const actualTotal = totals.reduce((sum, item) => sum + item.actual, 0)
    const plannedTotal = totals.reduce((sum, item) => sum + item.planned, 0)
    const percentage = plannedTotal === 0 ? '—' : `${Math.round((actualTotal / plannedTotal) * 100)}%`
    const singleDay = selection.start === selection.end
    return <div className="detail-content"><p>{singleDay ? '当天有效习惯的目标量和完成量。' : '该范围有效习惯的目标量和完成量。'}</p><dl><div><dt>整体</dt><dd>{actualTotal} / {plannedTotal}（{percentage}）</dd></div></dl><ul>{totals.map(({ habit, actual, planned }) => <li key={habit.id}>{habit.name}：{actual} / {planned}</li>)}</ul></div>
  }

  if (selection.kind === 'habit') {
    const habit = report.habits.find((item) => item.habitId === selection.habitId)
    if (!habit) return null
    return <div className="detail-content"><dl><div><dt>有效日期</dt><dd>{habit.validDays} 天</dd></div><div><dt>执行率</dt><dd>{habit.rate ?? '—'}%（{habit.actual} / {habit.planned}）</dd></div><div><dt>变化</dt><dd>{changeText(habit.deltaPercentagePoints)}</dd></div></dl><Link className="button secondary" to={`/manage?habit=${encodeURIComponent(habit.habitId)}`}>前往管理</Link></div>
  }

  if (!pair) return null
  const sampleText = pair.sampleLevel === 'rankable' ? '可排序样本（≥14 天）' : pair.sampleLevel === 'preliminary' ? '初步线索（7–13 天）' : '数据积累中（少于 7 天）'
  return <div className="detail-content"><p>共同有效日期：{pair.commonDays} 天。</p><dl><div><dt>同时达标</dt><dd>{pair.bothComplete} 天（{pair.bothCompleteRate}%）：{pair.bothCompleteDates.join('、') || '无'}</dd></div><div><dt>同时未达标</dt><dd>{pair.bothIncomplete} 天（{pair.bothIncompleteRate}%）：{pair.bothIncompleteDates.join('、') || '无'}</dd></div><div><dt>表现相反</dt><dd>{pair.opposite} 天（{pair.oppositeRate}%）：{pair.oppositeDates.join('、') || '无'}</dd></div><div><dt>样本等级</dt><dd>{sampleText}</dd></div></dl><p>伴随关系不代表因果；这只描述同一批日期中的共同变化。</p></div>
}
