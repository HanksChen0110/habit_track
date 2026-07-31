import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  closeDisabled = false,
  children,
  variant = 'dialog'
}: {
  title: string
  onClose: () => void
  closeDisabled?: boolean
  children: ReactNode
  variant?: 'dialog' | 'sheet'
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )
  const onCloseRef = useRef(onClose)
  const closeDisabledRef = useRef(closeDisabled)
  onCloseRef.current = onClose
  closeDisabledRef.current = closeDisabled

  useEffect(() => {
    const dialog = dialogRef.current
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>('button, input, select, textarea, [href], [tabindex]') ?? []
      ).filter((element) => !element.matches('[disabled], [tabindex="-1"]'))

    const initialFocus = dialog?.querySelector<HTMLElement>('[autofocus]') ?? focusable()[0]
    initialFocus?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabledRef.current) onCloseRef.current()
      if (event.key !== 'Tab') return

      const available = focusable()
      if (available.length === 0) return
      const first = available[0]
      const last = available.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      previousFocusRef.current?.focus()
    }
  }, [])

  return (
    <div className={`modal-backdrop ${variant === 'sheet' ? 'is-sheet' : ''}`} onMouseDown={(event) => event.target === event.currentTarget && !closeDisabled && onClose()}>
      <section ref={dialogRef} className={`modal ${variant === 'sheet' ? 'detail-sheet' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">循迹</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" disabled={closeDisabled} onClick={onClose} aria-label={`关闭${title}`}>
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
