import { useState } from 'react'
import { ArrowRight, Eye, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../app/AppStore'
import { Brand } from '../components/Brand'

export function OnboardingPage() {
  const { beginDemo, beginEmpty, error } = useAppStore()
  const navigate = useNavigate()
  const [busyMode, setBusyMode] = useState<'empty' | 'demo' | null>(null)

  const choose = async (mode: 'empty' | 'demo') => {
    if (busyMode) return
    setBusyMode(mode)
    try {
      const saved = mode === 'empty' ? await beginEmpty() : await beginDemo()
      if (saved) navigate('/today', { replace: true })
    } finally {
      setBusyMode(null)
    }
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
          aria-label={busyMode === 'empty' ? '开始中…' : '开始记录'}
          disabled={busyMode !== null}
          onClick={() => void choose('empty')}
        >
          <span className="choice-icon"><ArrowRight size={20} /></span>
          <span>
            <strong>{busyMode === 'empty' ? '开始中…' : '开始记录'}</strong>
            <small>从空白开始，创建你的第一个每日习惯</small>
          </span>
        </button>
        <button
          className="choice-card"
          type="button"
          aria-label={busyMode === 'demo' ? '载入中…' : '载入示例'}
          disabled={busyMode !== null}
          onClick={() => void choose('demo')}
        >
          <span className="choice-icon lavender"><Eye size={20} /></span>
          <span>
            <strong>{busyMode === 'demo' ? '载入中…' : '载入示例'}</strong>
            <small>用三项示例习惯立即体验完整周报</small>
          </span>
        </button>
      </section>
      {error ? <p className="account-error onboarding-error" role="alert">{error}</p> : null}
      <footer><Sparkles size={15} /> 记录保存在当前账号的本机数据库</footer>
    </main>
  )
}
