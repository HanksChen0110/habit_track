import type { InsightRange } from '../domain/insightTypes'

const ranges: InsightRange[] = [7, 30, 90]

export function InsightRangeTabs({
  value,
  onChange
}: {
  value: InsightRange
  onChange: (range: InsightRange) => void
}) {
  return (
    <div className="insight-range-tabs" role="group" aria-label="洞察时间范围">
      {ranges.map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={value === range}
          onClick={() => onChange(range)}
        >
          {range} 天
        </button>
      ))}
    </div>
  )
}
