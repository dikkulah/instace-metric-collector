import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusPill } from './StatusPill'
import { formatBytes, formatPercent } from '../lib/format'

export interface DiagnosticItem {
  id: string
  type: string
  severity: string
  detectedAt: string
  summaryKey: string
  details?: Record<string, unknown>
}

interface DiagnosticMetric {
  label: string
  value: string
}

/** Stable identity — only list once per distinct cause (not per fluctuating metric values). */
export function diagnosticDedupeKey(item: DiagnosticItem): string {
  const d = item.details ?? {}
  switch (item.type) {
    case 'DISK_FILLING':
      return `${item.type}|${String(d.mount ?? '')}`
    case 'CONTAINER_FLAP':
      return `${item.type}|${String(d.containerId ?? d.containerName ?? '')}`
    case 'CONNECTIVITY_FAIL':
      return `${item.type}|${String(d.target ?? '')}`
    default:
      return item.type
  }
}

function dedupeInsights(items: DiagnosticItem[]): DiagnosticItem[] {
  const seen = new Map<string, DiagnosticItem>()
  for (const item of items) {
    const key = diagnosticDedupeKey(item)
    const existing = seen.get(key)
    if (!existing || item.detectedAt > existing.detectedAt) {
      seen.set(key, item)
    }
  }
  return [...seen.values()].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
}

function severityTone(severity: string): 'success' | 'warning' | 'neutral' {
  if (severity === 'critical') return 'warning'
  if (severity === 'warning') return 'warning'
  return 'neutral'
}

function strVal(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function reasonText(
  t: (key: string, opts?: Record<string, unknown>) => string,
  item: DiagnosticItem,
): string {
  const d = item.details ?? {}
  switch (item.type) {
    case 'CPU_SPIKE':
      return t('diagnostics.reason.cpuSpike', {
        current: formatPercent(Number(d.cpuLoad ?? 0)),
        previous: formatPercent(Number(d.previousCpu ?? 0)),
        threshold: formatPercent(Number(d.threshold ?? 50)),
      })
    case 'MEMORY_PRESSURE': {
      const ratio = Number(d.ratio ?? 0) * 100
      return t('diagnostics.reason.memoryPressure', {
        used: formatBytes(Number(d.usedMemory ?? 0)),
        total: formatBytes(Number(d.totalMemory ?? 0)),
        percent: formatPercent(ratio),
        threshold: formatPercent(Number(d.thresholdPct ?? 85)),
      })
    }
    case 'DISK_FILLING': {
      const mount = strVal(d.mount)
      const percent = formatPercent(Number(d.usePercent ?? 0))
      const threshold = formatPercent(Number(d.thresholdPct ?? 85))
      if (mount) {
        return t('diagnostics.reason.diskFilling', { mount, percent, threshold })
      }
      return t('diagnostics.reason.diskFillingGeneric', { percent, threshold })
    }
    case 'CONTAINER_FLAP': {
      const name = strVal(d.containerName) ?? strVal(d.containerId) ?? t('diagnostics.unknownContainer')
      return t('diagnostics.reason.containerFlap', {
        name,
        count: Number(d.restartCount ?? 0),
        threshold: Number(d.threshold ?? 3),
      })
    }
    case 'CONNECTIVITY_FAIL':
      return t('diagnostics.reason.connectivityFail', {
        target: strVal(d.target) ?? t('diagnostics.unknownTarget'),
        error: strVal(d.error) ?? t('diagnostics.reason.unknownError'),
      })
    default:
      return t('diagnostics.reason.generic', { type: item.type })
  }
}

function metricsForItem(
  t: (key: string, opts?: Record<string, unknown>) => string,
  item: DiagnosticItem,
): DiagnosticMetric[] {
  const d = item.details ?? {}
  const push = (label: string, value: string | null): DiagnosticMetric[] =>
    value ? [{ label, value }] : []

  switch (item.type) {
    case 'CPU_SPIKE':
      return [
        ...push(t('diagnostics.metric.cpuCurrent'), formatPercent(Number(d.cpuLoad ?? 0))),
        ...push(t('diagnostics.metric.cpuPrevious'), formatPercent(Number(d.previousCpu ?? 0))),
        ...push(t('diagnostics.metric.threshold'), formatPercent(Number(d.threshold ?? 50))),
      ]
    case 'MEMORY_PRESSURE':
      return [
        ...push(t('diagnostics.metric.memory'), formatPercent(Number(d.ratio ?? 0) * 100)),
        ...push(
          t('diagnostics.metric.memoryBytes'),
          `${formatBytes(Number(d.usedMemory ?? 0))} / ${formatBytes(Number(d.totalMemory ?? 0))}`,
        ),
        ...push(t('diagnostics.metric.threshold'), formatPercent(Number(d.thresholdPct ?? 85))),
      ]
    case 'DISK_FILLING':
      return [
        ...push(t('diagnostics.metric.mount'), strVal(d.mount)),
        ...push(t('diagnostics.metric.diskUsed'), formatPercent(Number(d.usePercent ?? 0))),
        ...push(t('diagnostics.metric.threshold'), formatPercent(Number(d.thresholdPct ?? 85))),
      ]
    case 'CONTAINER_FLAP':
      return [
        ...push(t('diagnostics.metric.container'), strVal(d.containerName) ?? strVal(d.containerId)),
        ...push(t('diagnostics.metric.restarts'), String(Number(d.restartCount ?? 0))),
        ...push(t('diagnostics.metric.threshold'), String(Number(d.threshold ?? 3))),
      ]
    case 'CONNECTIVITY_FAIL':
      return [
        ...push(t('diagnostics.metric.target'), strVal(d.target)),
        ...push(t('diagnostics.metric.error'), strVal(d.error)),
        ...(d.latency != null
          ? push(t('diagnostics.metric.latency'), `${Number(d.latency)} ms`)
          : []),
      ]
    default:
      return Object.entries(d)
        .map(([k, v]) => push(k, strVal(v)))
        .flat()
  }
}

function DiagnosticCard({
  item,
  t,
}: {
  item: DiagnosticItem
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const metrics = metricsForItem(t, item)
  const accent =
    item.severity === 'critical'
      ? 'border-l-error'
      : item.severity === 'warning'
        ? 'border-l-amber-400'
        : 'border-l-outline-variant'

  return (
    <article className={`panel border-l-4 ${accent} p-5 space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">
          {t(item.summaryKey, { defaultValue: item.type })}
        </h3>
        <StatusPill label={item.severity} tone={severityTone(item.severity)} />
      </div>

      <p className="text-sm text-on-surface-variant leading-relaxed">{reasonText(t, item)}</p>

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-md bg-surface-high/70 px-3 py-2 min-w-0">
              <div className="text-[10px] label-caps truncate">{m.label}</div>
              <div className="text-sm font-medium mono mt-1 truncate" title={m.value}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-on-surface-variant/70 pt-1 border-t border-outline-variant/40">
        {t('diagnostics.lastSeen')}: {new Date(item.detectedAt).toLocaleString()}
      </div>
    </article>
  )
}

export function DiagnosticPanel({ items }: { items: DiagnosticItem[] }) {
  const { t } = useTranslation()
  const unique = useMemo(() => dedupeInsights(items), [items])

  if (unique.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {unique.map((d) => (
        <DiagnosticCard key={diagnosticDedupeKey(d)} item={d} t={t} />
      ))}
    </div>
  )
}
