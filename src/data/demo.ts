import { addDays } from '../domain/dates'
import type { Completion, Habit, Store } from '../domain/types'

function addCompletion(
  completions: Completion[],
  habitId: string,
  date: string,
  count: number
) {
  if (count > 0) completions.push({ habitId, date, count })
}

export function createDemoStore(today: string): Store {
  const createdOn = addDays(today, -60)
  const habits: Habit[] = [
    {
      id: 'demo-reading',
      name: '阅读 30 分钟',
      targetPerDay: 1,
      createdOn,
      archivedOn: null
    },
    {
      id: 'demo-exercise',
      name: '拉伸与训练',
      targetPerDay: 1,
      createdOn,
      archivedOn: null
    },
    {
      id: 'demo-english',
      name: '英语听力',
      targetPerDay: 2,
      createdOn,
      archivedOn: null
    }
  ]
  const completions: Completion[] = []

  for (let offset = -60; offset <= 0; offset += 1) {
    const date = addDays(today, offset)
    const index = offset + 60
    const reading = index % 6 === 0 ? 0 : 1
    const exercise = reading === 1 && index % 4 !== 0 ? 1 : 0
    const english = index % 5 === 0 ? 1 : 2

    addCompletion(completions, 'demo-reading', date, reading)
    addCompletion(completions, 'demo-exercise', date, exercise)
    addCompletion(completions, 'demo-english', date, english)
  }

  return { version: 1, habits, completions }
}
