import { useMemo } from 'react'
import type { HistoryPoint } from '../lib/historySeries'

const WIDTH = 640
const HEIGHT = 140
const PAD = { top: 12, right: 12, bottom: 28, left: 44 }

function formatAxisTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function MetricTrendChart({
  points,
  label,
  formatValue,
  max = 100,
  color = 'var(--color-primary-container)',
}: {
  points: HistoryPoint[]
  label: string
  formatValue: (v: number) => string
  max?: number
  color?: string
}) {
  const chart = useMemo(() => {
    if (points.length === 0) return null

    const innerW = WIDTH - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom
    const values = points.map((p) => p.value)
    const yMax = Math.max(max, ...values, 1)

    const xAt = (i: number) => PAD.left + (i / Math.max(points.length - 1, 1)) * innerW
    const yAt = (v: number) => PAD.top + innerH - (v / yMax) * innerH

    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
      .join(' ')

    const area = `${line} L ${xAt(points.length - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`

    const last = points[points.length - 1]
    const firstLabel = formatAxisTime(points[0].at)
    const lastLabel = formatAxisTime(last.at)

    return { line, area, last, yMax, firstLabel, lastLabel, yAt: yAt(yMax), yMid: yAt(yMax / 2) }
  }, [points, max])

  if (!chart) {
    return (
      <div className="panel p-4">
        <h3 className="label-caps mb-2">{label}</h3>
        <div className="h-[140px] flex items-center justify-center text-sm text-on-surface-variant">
          —
        </div>
      </div>
    )
  }

  return (
    <div className="panel p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="label-caps">{label}</h3>
        <span className="text-sm mono text-primary">{formatValue(chart.last.value)}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label={label}
      >
        <line
          x1={PAD.left}
          y1={PAD.top + (HEIGHT - PAD.top - PAD.bottom)}
          x2={WIDTH - PAD.right}
          y2={PAD.top + (HEIGHT - PAD.top - PAD.bottom)}
          stroke="var(--color-outline-variant)"
          strokeWidth="1"
        />
        <text x={PAD.left - 6} y={chart.yAt + 4} textAnchor="end" className="fill-on-surface-variant text-[10px]">
          {formatValue(chart.yMax)}
        </text>
        <text x={PAD.left - 6} y={chart.yMid + 4} textAnchor="end" className="fill-on-surface-variant text-[10px]">
          {formatValue(chart.yMax / 2)}
        </text>
        <path d={chart.area} fill={color} fillOpacity="0.2" />
        <path d={chart.line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        <text x={PAD.left} y={HEIGHT - 6} className="fill-on-surface-variant text-[10px]">
          {chart.firstLabel}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-on-surface-variant text-[10px]">
          {chart.lastLabel}
        </text>
      </svg>
    </div>
  )
}
