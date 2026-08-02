const pages = [...document.querySelectorAll('.page')]
const navItems = [...document.querySelectorAll('.nav-item')]
const toast = document.querySelector('.toast')

function showPage(id) {
  pages.forEach((page) => page.classList.toggle('active', page.id === id))
  document.querySelectorAll('[data-page]').forEach((item) => item.classList.toggle('active', item.dataset.page === id))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

document.querySelectorAll('[data-page]').forEach((button) => {
  button.addEventListener('click', () => showPage(button.dataset.page))
})

function updateToday() {
  const rows = [...document.querySelectorAll('.habit-row')]
  const done = rows.reduce((sum, row) => sum + Number(row.dataset.count), 0)
  const goal = rows.reduce((sum, row) => sum + Number(row.dataset.target), 0)
  document.querySelector('#today-count').textContent = done
  document.querySelector('#today-bar').style.width = `${(done / goal) * 100}%`
  document.querySelector('#today-copy').textContent = done === goal ? '今天的计划全部完成。' : `已完成 ${done} / ${goal}，继续保持节奏。`
  rows.forEach((row) => {
    const count = Number(row.dataset.count)
    const target = Number(row.dataset.target)
    row.querySelector('.stepper b').textContent = `${count} / ${target}`
    row.classList.toggle('done', count === target)
    const dot = row.querySelector('.state-dot')
    dot.classList.toggle('complete', count === target)
    dot.textContent = count === target ? '✓' : '·'
    row.querySelector('.habit-name p').textContent = count === target ? `已完成 · 每日 ${target} 次` : count ? `已完成 ${count} 次 · 每日 ${target} 次` : `尚未开始 · 每日 ${target} 次`
  })
}

document.querySelectorAll('.habit-row').forEach((row) => {
  row.querySelector('.minus').addEventListener('click', () => {
    row.dataset.count = Math.max(0, Number(row.dataset.count) - 1)
    updateToday()
  })
  row.querySelector('.plus').addEventListener('click', () => {
    row.dataset.count = Math.min(Number(row.dataset.target), Number(row.dataset.count) + 1)
    updateToday()
  })
})

document.querySelectorAll('.date-strip button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.date-strip .selected').classList.remove('selected')
    button.classList.add('selected')
    toast.textContent = `${button.querySelector('b').textContent} 日的记录已选中（演示）`
    toast.classList.add('visible')
    setTimeout(() => toast.classList.remove('visible'), 1800)
  })
})

document.querySelectorAll('.range-tabs button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.range-tabs .active').classList.remove('active')
    button.classList.add('active')
    toast.textContent = `已切换到 ${button.textContent} 观察窗口（演示）`
    toast.classList.add('visible')
    setTimeout(() => toast.classList.remove('visible'), 1800)
  })
})

updateToday()
