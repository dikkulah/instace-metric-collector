export function StatusPill({
  label,
  tone = 'neutral',
  pulse = false,
}: {
  label: string
  tone?: 'success' | 'warning' | 'error' | 'neutral'
  pulse?: boolean
}) {
  const colors = {
    success: 'bg-tertiary/20 text-tertiary border-tertiary/40',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    error: 'bg-error/20 text-error border-error/40',
    neutral: 'bg-surface-highest text-on-surface-variant border-outline-variant',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${colors[tone]}`}>
      <span
        className={`w-2 h-2 rounded-full bg-current opacity-80 ${
          pulse ? 'status-breath' : ''
        }`}
      />
      {label}
    </span>
  )
}
