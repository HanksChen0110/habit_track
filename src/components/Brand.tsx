export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="循迹">
      <svg className="brand-mark" viewBox="0 0 40 24" aria-hidden="true">
        <path d="M3 17.5h10.5L19 6l5.2 10.8L37 5.5" />
        <circle cx="3" cy="17.5" r="2" />
        <circle cx="37" cy="5.5" r="2" />
      </svg>
      {!compact && <span>循迹</span>}
    </div>
  )
}
