import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { HistoryPoint } from '../lib/historySeries'
import {
  processLabel,
  serviceLabel,
  topProcessesByCpu,
  topServices,
} from '../lib/historySeries'
import { formatPercent } from '../lib/format'
import { StatusPill } from './StatusPill'

const TOOLTIP_WIDTH = 260
const VIEWPORT_MARGIN = 8
const GAP = 12

function serviceStatusTone(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'RUNNING') return 'success'
  if (status === 'ERROR') return 'error'
  return 'neutral'
}

function formatAxisTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function clampTooltipTop(anchorY: number, height: number): number {
  const spaceAbove = anchorY - VIEWPORT_MARGIN
  const spaceBelow = window.innerHeight - anchorY - VIEWPORT_MARGIN
  let top: number

  if (spaceAbove >= height + GAP && spaceAbove >= spaceBelow) {
    top = anchorY - height - GAP
  } else {
    top = anchorY + GAP
  }

  return Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - height - VIEWPORT_MARGIN))
}

export function ChartTooltip({
  point,
  label,
  formatValue,
  anchorX,
  anchorY,
}: {
  point: HistoryPoint
  label: string
  formatValue: (v: number) => string
  anchorX: number
  anchorY: number
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState<number | null>(null)

  const sample = point.sample
  const cpuProcs = sample ? topProcessesByCpu(sample) : []
  const services = sample ? topServices(sample) : []

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setTop(clampTooltipTop(anchorY, el.offsetHeight))
  }, [anchorX, anchorY, cpuProcs.length, services.length, point.at, label])

  const clampedX = Math.min(
    Math.max(anchorX, TOOLTIP_WIDTH / 2 + VIEWPORT_MARGIN),
    window.innerWidth - TOOLTIP_WIDTH / 2 - VIEWPORT_MARGIN,
  )

  const tooltip = (
    <div
      ref={ref}
      className="pointer-events-none w-[260px] rounded-lg border border-outline-variant bg-surface-highest shadow-xl p-3 text-xs"
      style={{
        position: 'fixed',
        left: clampedX,
        top: top ?? anchorY + GAP,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        opacity: top == null ? 0 : 1,
      }}
    >
      <div className="font-medium text-sm text-on-surface">{formatAxisTime(point.at)}</div>
      <div className="text-on-surface-variant mt-0.5 mb-2.5">
        {label}: <span className="text-primary font-medium mono">{formatValue(point.value)}</span>
      </div>

      {cpuProcs.length > 0 && (
        <section className="mb-2.5">
          <div className="label-caps text-[10px] text-on-surface-variant mb-1.5">
            {t('history.tooltip.topCpuProcesses')}
          </div>
          <ul className="space-y-1">
            {cpuProcs.map((p) => (
              <li
                key={`${p.pid}-${processLabel(p.command)}`}
                className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 items-baseline"
              >
                <span className="mono text-on-surface truncate" title={p.command}>
                  {processLabel(p.command)}
                </span>
                <span className="mono text-primary font-medium tabular-nums">{formatPercent(p.cpuUsage)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {services.length > 0 && (
        <section>
          <div className="label-caps text-[10px] text-on-surface-variant mb-1.5">
            {t('history.tooltip.topServices')}
          </div>
          <ul className="space-y-1.5">
            {services.map((s) => (
              <li key={s.serviceName} className="flex items-center justify-between gap-2 min-w-0">
                <span className="mono text-on-surface truncate min-w-0" title={s.serviceName}>
                  {serviceLabel(s.serviceName)}
                </span>
                <StatusPill
                  label={s.status}
                  tone={serviceStatusTone(s.status)}
                  pulse={s.status === 'RUNNING'}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {sample && cpuProcs.length === 0 && services.length === 0 && (
        <p className="text-on-surface-variant">{t('history.tooltip.noProcessData')}</p>
      )}
    </div>
  )

  return createPortal(tooltip, document.body)
}
