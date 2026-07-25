import type { HabitInsight } from '../domain/insightTypes'

export type HabitSort = 'attention' | 'rate' | 'name'

interface HabitPerformanceListProps {
  habits: HabitInsight[]
  selectedHabitId: string | null
  sort: HabitSort
  onSortChange: (sort: HabitSort) => void
  onSelectHabit: (habitId: string) => void
}

const sorts: Array<{ value: HabitSort; label: string; ariaLabel: string }> = [
  { value: 'attention', label: '需关注', ariaLabel: '按需关注排序' },
  { value: 'rate', label: '执行率', ariaLabel: '按执行率排序' },
  { value: 'name', label: '名称', ariaLabel: '按名称排序' }
]

function sortHabits(habits: HabitInsight[], sort: HabitSort) {
  return [...habits].sort((left, right) => {
    if (sort === 'attention') {
      const leftDown = left.trend === 'down'
      const rightDown = right.trend === 'down'
      if (leftDown && rightDown) {
        const delta = (left.deltaPercentagePoints ?? Infinity) - (right.deltaPercentagePoints ?? Infinity)
        if (delta !== 0) return delta
      } else if (leftDown !== rightDown) return leftDown ? -1 : 1
      const rate = (left.rate ?? Infinity) - (right.rate ?? Infinity)
      if (rate !== 0) return rate
    }
    if (sort === 'rate') {
      if (left.rate === null || right.rate === null) {
        if (left.rate !== right.rate) return left.rate === null ? 1 : -1
      } else if (left.rate !== right.rate) return right.rate - left.rate
    }
    if (sort === 'name') {
      const name = left.name.localeCompare(right.name, 'zh-CN')
      if (name !== 0) return name
    }
    return left.habitId.localeCompare(right.habitId)
  })
}

function trendText(habit: HabitInsight) {
  if (habit.trend === 'up') return '趋势上升'
  if (habit.trend === 'down') return '趋势下降'
  if (habit.trend === 'stable') return '趋势稳定'
  return '趋势暂无判断'
}

export function HabitPerformanceList({
  habits,
  selectedHabitId,
  sort,
  onSortChange,
  onSelectHabit
}: HabitPerformanceListProps) {
  const sortedHabits = sortHabits(habits, sort)

  return (
    <section aria-labelledby="habit-performance-heading">
      <h2 id="habit-performance-heading">习惯表现</h2>
      <div role="group" aria-label="习惯表现排序">
        {sorts.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-label={item.ariaLabel}
            aria-pressed={sort === item.value}
            onClick={() => onSortChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <ul>
        {sortedHabits.map((habit) => (
          <li key={habit.habitId}>
            <button
              type="button"
              aria-pressed={selectedHabitId === habit.habitId}
              aria-label={`查看${habit.name}的趋势`}
              onClick={() => onSelectHabit(habit.habitId)}
            >
              <strong>{habit.name}</strong>
              <span>{habit.rate === null ? '暂无执行率' : `执行率 ${habit.rate}%`}</span>
              <span>有效计划日 {habit.validDays} 天</span>
              <span>{trendText(habit)}</span>
              <span>
                {habit.deltaPercentagePoints === null
                  ? '暂无可比周期'
                  : `较上一周期${habit.deltaPercentagePoints >= 0 ? '+' : ''}${habit.deltaPercentagePoints} 个百分点`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
