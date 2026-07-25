import type { CoOccurrencePair, CoOccurrenceView, HabitInsight } from '../domain/insightTypes'

interface CoOccurrenceMatrixProps {
  habits: HabitInsight[]
  pairs: CoOccurrencePair[]
  view: CoOccurrenceView
  onViewChange: (view: CoOccurrenceView) => void
  onSelectPair: (pair: CoOccurrencePair) => void
}

const views: Array<{ value: CoOccurrenceView; label: string }> = [
  { value: 'bothComplete', label: '同时达标' },
  { value: 'bothIncomplete', label: '同时未达标' },
  { value: 'opposite', label: '表现相反' }
]

const viewRate = (pair: CoOccurrencePair, view: CoOccurrenceView) =>
  view === 'bothComplete'
    ? pair.bothCompleteRate
    : view === 'bothIncomplete'
      ? pair.bothIncompleteRate
      : pair.oppositeRate

function cellStatus(pair: CoOccurrencePair, view: CoOccurrenceView) {
  if (pair.sampleLevel === 'collecting') return '积累中'
  const rate = `${viewRate(pair, view)}%`
  return pair.sampleLevel === 'preliminary' ? `${rate}（初步线索（7–13 天））` : rate
}

export function CoOccurrenceMatrix({ habits, pairs, view, onViewChange, onSelectPair }: CoOccurrenceMatrixProps) {
  const selectedView = views.find((item) => item.value === view)?.label ?? ''
  const pairFor = (firstId: string, secondId: string) =>
    pairs.find(
      (pair) =>
        (pair.habitAId === firstId && pair.habitBId === secondId) ||
        (pair.habitAId === secondId && pair.habitBId === firstId)
    )

  return (
    <section aria-labelledby="co-occurrence-heading">
      <h2 id="co-occurrence-heading">习惯共现</h2>
      <div role="group" aria-label="共现视角">
        {views.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={view === item.value}
            onClick={() => onViewChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="cooccurrence-scroll">
        <table aria-label="习惯共现矩阵">
          <thead>
            <tr>
              <th scope="col">习惯</th>
              {habits.map((habit) => <th key={habit.habitId} scope="col">{habit.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {habits.map((rowHabit, rowIndex) => (
              <tr key={rowHabit.habitId}>
                <th scope="row">{rowHabit.name}</th>
                {habits.map((columnHabit, columnIndex) => {
                  if (rowHabit.habitId === columnHabit.habitId) return <td key={columnHabit.habitId}>同一习惯</td>
                  const pair = pairFor(rowHabit.habitId, columnHabit.habitId)
                  if (!pair) return <td key={columnHabit.habitId}>暂无数据</td>
                  if (rowIndex > columnIndex) return <td key={columnHabit.habitId}>同上</td>
                  const status = cellStatus(pair, view)
                  const rate = viewRate(pair, view)
                  return (
                    <td key={columnHabit.habitId}>
                      <button
                        type="button"
                        aria-label={`${pair.habitAName}与${pair.habitBName}，${selectedView}，${status}`}
                        onClick={() => onSelectPair(pair)}
                        style={pair.sampleLevel === 'rankable' ? { backgroundColor: `rgba(106, 76, 147, ${0.12 + rate / 125})` } : undefined}
                      >
                        {status}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
