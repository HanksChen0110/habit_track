import type { KeyboardEvent } from 'react'
import type { InsightRange, InsightTrendPoint } from '../domain/insightTypes'

interface InsightTrendChartProps {
  range: InsightRange
  overall: InsightTrendPoint[]
  selectedHabitName: string | null
  selectedHabit: InsightTrendPoint[]
  onSelectDate: (date: string) => void
}

const left = 36
const top = 20
const width = 664
const height = 200

function coordinate(index: number, count: number, value: number) {
  return {
    x: left + (count <= 1 ? width / 2 : (index / (count - 1)) * width),
    y: top + ((100 - value) / 100) * height
  }
}

function paths(points: InsightTrendPoint[], value: 'rate' | 'smoothedRate') {
  const segments: string[] = []
  let segment = ''
  points.forEach((point, index) => {
    const current = point[value]
    if (current === null) {
      if (segment) segments.push(segment)
      segment = ''
      return
    }
    const { x, y } = coordinate(index, points.length, current)
    segment += `${segment ? ' L' : 'M'} ${x} ${y}`
  })
  if (segment) segments.push(segment)
  return segments
}

function activate(event: KeyboardEvent<SVGGElement>, date: string, onSelectDate: (date: string) => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onSelectDate(date)
  }
}

function rateText(rate: number | null) {
  return rate === null ? '无计划' : `${rate}%`
}

export function InsightTrendChart({
  range,
  overall,
  selectedHabitName,
  selectedHabit,
  onSelectDate
}: InsightTrendChartProps) {
  const selectedByDate = new Map(selectedHabit.map((point) => [point.start, point]))

  return (
    <section className="insight-trend" data-testid="insight-trend-chart" data-range={range} aria-label="执行率趋势">
      <div className="insight-trend-heading">
        <h2>执行率趋势</h2>
        {selectedHabitName && <span>{selectedHabitName}</span>}
      </div>
      <svg viewBox="0 0 720 260" aria-labelledby="insight-trend-title">
        <title id="insight-trend-title">执行率趋势，纵轴固定为 0 到 100%</title>
        {[0, 50, 100].map((value) => {
          const y = coordinate(0, 1, value).y
          return <path key={value} d={`M ${left} ${y} H ${left + width}`} stroke="#E2E5E3" strokeWidth="1" />
        })}
        {range === 30 && paths(overall, 'smoothedRate').map((path, index) => (
          <path key={`overall-smooth-${index}`} d={path} fill="none" stroke="#20191B" strokeOpacity=".3" strokeWidth="2" />
        ))}
        {paths(overall, 'rate').map((path, index) => (
          <path key={`overall-${index}`} d={path} fill="none" stroke="#20191B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {selectedHabitName && range === 30 && paths(selectedHabit, 'smoothedRate').map((path, index) => (
          <path key={`selected-smooth-${index}`} d={path} fill="none" stroke="#A98BEE" strokeOpacity=".35" strokeWidth="2" />
        ))}
        {selectedHabitName && paths(selectedHabit, 'rate').map((path, index) => (
          <path key={`selected-${index}`} d={path} fill="none" stroke="#A98BEE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {overall.map((point, index) => {
          if (point.rate === null) return null
          const { x, y } = coordinate(index, overall.length, point.rate)
          const selectedPoint = selectedByDate.get(point.start)
          const selectedCoordinate = selectedPoint?.rate === null || !selectedPoint
            ? null
            : coordinate(index, overall.length, selectedPoint.rate)
          const label = `${point.start}，整体执行率 ${rateText(point.rate)}${selectedHabitName ? `，${selectedHabitName} ${rateText(selectedPoint?.rate ?? null)}` : ''}`
          return (
            <g
              key={point.key}
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={() => onSelectDate(point.start)}
              onKeyDown={(event) => activate(event, point.start, onSelectDate)}
            >
              <rect x={x - 22} y={y - 22} width="44" height="44" fill="transparent" />
              <circle cx={x} cy={y} r="4" fill="#20191B" />
              {selectedCoordinate && <circle cx={selectedCoordinate.x} cy={selectedCoordinate.y} r="4" fill="#A98BEE" />}
            </g>
          )
        })}
        <text x="8" y={top + 4} fill="#666D69" fontSize="11">100%</text>
        <text x="14" y={top + height + 4} fill="#666D69" fontSize="11">0%</text>
      </svg>
      <ul className="visually-hidden">
        {overall.map((point) => (
          <li key={point.key}>
            {point.start}：整体执行率 {rateText(point.rate)}
            {selectedHabitName && `；${selectedHabitName} ${rateText(selectedByDate.get(point.start)?.rate ?? null)}`}
          </li>
        ))}
      </ul>
    </section>
  )
}
