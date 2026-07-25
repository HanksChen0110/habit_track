import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useAppStore } from '../app/AppStore'
import { Brand } from '../components/Brand'

export function RecoveryPage() {
  const { previewImport, confirmImport } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  async function handleFile(file: File | undefined) {
    if (!file) return

    try {
      const text = await file.text()
      const preview = previewImport(text)
      confirmImport(preview)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '无法读取这个备份文件。')
    }
  }

  return (
    <main className="recovery-page">
      <section className="recovery-card" aria-labelledby="recovery-title">
        <Brand />
        <div className="recovery-copy">
          <p className="eyebrow">数据保护</p>
          <h1 id="recovery-title">本地数据需要恢复</h1>
          <p>
            浏览器中的数据无法通过完整性校验。循迹没有清空或覆盖原数据，请选择一个有效的 JSON
            备份恢复。
          </p>
        </div>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="选择 JSON 备份"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <button className="primary-button" type="button" onClick={() => inputRef.current?.click()}>
          <Upload size={18} aria-hidden="true" />
          选择备份恢复
        </button>
        {message ? <p className="form-error" role="alert">{message}</p> : null}
        <p className="recovery-note">恢复前，损坏的数据会原样保留在当前浏览器中。</p>
      </section>
    </main>
  )
}
