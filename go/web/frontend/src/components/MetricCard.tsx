export function barTone(percent: number): 'success' | 'warning' | 'error' {
  if (percent >= 85) return 'error'
  if (percent >= 60) return 'warning'
  return 'success'
}

const toneClass = {
  success: 'bg-tertiary',
  warning: 'bg-yellow-400',
  error: 'bg-error',
}

export function MetricCard({
  label,
  value,
  percent,
  subtitle,
}: {
  label: string
  value: string
  percent?: number
  subtitle?: string
}) {
  const tone = percent != null ? barTone(percent) : undefined
  return (
    <div className="panel p-5 flex flex-col gap-3 min-w-0">
      <div className="label-caps">{label}</div>
      <div className="text-xl font-semibold mono truncate">{value}</div>
      {subtitle && <div className="text-xs text-on-surface-variant mono">{subtitle}</div>}
      {percent != null && (
        <div className="h-2 rounded-full bg-surface-highest overflow-hidden">
          <div
            className={`h-full ${toneClass[tone!]}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
