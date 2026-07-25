import { ArrowRight, Eye, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../app/AppStore'
import { Brand } from '../components/Brand'

export function OnboardingPage() {
  const { beginDemo, beginEmpty } = useAppStore()
  const navigate = useNavigate()
  const choose = (mode: 'empty' | 'demo') => {
    if (mode === 'empty') beginEmpty()
    else beginDemo()
    navigate('/today', { replace: true })
  }

  return (
    <main className="onboarding">
      <div className="onboarding-pattern" aria-hidden="true" />
      <header><Brand /></header>
      <section className="onboarding-copy">
        <span className="eyebrow">每天轻量记录 · 每周看清执行</span>
        <h1>让行动留下清晰的轨迹。</h1>
        <p>不催促连续打卡，也不猜测原因。只记录真实完成量，在一周结束时看见可以调整的地方。</p>
      </section>
      <section className="onboarding-actions" aria-label="选择体验方式">
        <button
          className="choice-card primary-choice"
          type="button"
          aria-label="开始记录"
          onClick={() => choose('empty')}
        >
          <span className="choice-icon"><ArrowRight size={20} /></span>
          <span>
            <strong>开始记录</strong>
            <small>从空白开始，创建你的第一个每日习惯</small>
          </span>
        </button>
        <button
          className="choice-card"
          type="button"
          aria-label="载入示例"
          onClick={() => choose('demo')}
        >
          <span className="choice-icon lavender"><Eye size={20} /></span>
          <span>
            <strong>载入示例</strong>
            <small>用三项示例习惯立即体验完整周报</small>
          </span>
        </button>
      </section>
      <footer><Sparkles size={15} /> 数据仅保存在当前浏览器</footer>
    </main>
  )
}
