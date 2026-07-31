import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useAppStore } from '../app/AppStore'
import { Brand } from '../components/Brand'

export function RecoveryPage() {
  const { previewImport, confirmImport } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [isRecovering, setIsRecovering] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file || isRecovering) return

    setIsRecovering(true)
    try {
      setMessage('')
      const text = await file.text()
      const preview = previewImport(text)
      try {
        if (!(await confirmImport(preview))) {
          setMessage('恢复未完成，请重试。')
        }
      } catch {
        setMessage('恢复未完成，请重试。')
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '无法读取这个备份文件。')
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <main className="recovery-page">
      <section className="recovery-card" aria-labelledby="recovery-title">
        <Brand />
        <div className="recovery-copy">
          <p className="eyebrow">数据保护</p>
          <h1 id="recovery-title">账号数据需要恢复</h1>
          <p>
            当前账号的本机数据库未通过完整性校验。原数据没有被覆盖，请选择一份有效的完整 JSON
            备份恢复。
          </p>
        </div>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="选择 JSON 备份"
          disabled={isRecovering}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <button className="primary-button" type="button" disabled={isRecovering} onClick={() => inputRef.current?.click()}>
          <Upload size={18} aria-hidden="true" />
          {isRecovering ? '恢复中…' : '选择备份恢复'}
        </button>
        {message ? <p className="form-error" role="alert">{message}</p> : null}
        <p className="recovery-note">恢复完成前，原数据会保留在当前账号的本机数据库中。</p>
      </section>
    </main>
  )
}
