import type { InsightReport } from '../domain/insightTypes'

export type InsightSummaryMetric = 'overall' | 'plannedDays' | 'bestHabit' | 'attentionHabit'

export function InsightSummaryCards({
  report,
  onSelect
}: {
  report: InsightReport
  onSelect: (metric: InsightSummaryMetric) => void
}) {
  const cards: Array<{ metric: InsightSummaryMetric; label: string; value: string; detail: string }> = [
    {
      metric: 'overall',
      label: '整体执行率',
      value: report.overallRate === null ? '—' : `${report.overallRate}%`,
      detail:
        report.deltaPercentagePoints === null
          ? '暂无可比周期'
          : `较上一周期${report.deltaPercentagePoints >= 0 ? '+' : ''}${report.deltaPercentagePoints} 个百分点`
    },
    {
      metric: 'plannedDays',
      label: '有计划天数',
      value: `${report.plannedDays} 天`,
      detail: `共计划 ${report.plannedTotal} 次`
    },
    {
      metric: 'bestHabit',
      label: '最佳习惯',
      value: report.bestHabit?.name ?? '—',
      detail: report.bestHabit?.rate === null || !report.bestHabit ? '数据积累中' : `${report.bestHabit.rate}% 执行率`
    },
    {
      metric: 'attentionHabit',
      label: '需关注',
      value: report.attentionHabit?.name ?? '—',
      detail:
        report.attentionHabit?.rate === null || !report.attentionHabit
          ? '暂无稳定判断'
          : `${report.attentionHabit.rate}% 执行率`
    }
  ]

  return (
    <section className="insight-summary-cards" aria-label="洞察总览">
      {cards.map((card) => (
        <button
          key={card.metric}
          type="button"
          className={`insight-summary-card ${card.metric === 'overall' ? 'is-primary' : ''}`}
          onClick={() => onSelect(card.metric)}
        >
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <small>{card.detail}</small>
        </button>
      ))}
    </section>
  )
}
