import type { MetricsSnapshot, ProcessInfo, ServiceInfo } from '../api/types'
import type { HistoryTimeRange } from '../context/HistoryViewContext'
import { findProcessesForService, processLabel, serviceLabel } from './serviceProcessLink'

export interface HistoryPoint {
  at: string
  value: number
  sample?: MetricsSnapshot
}

const RANGE_HOURS: Record<HistoryTimeRange, number> = {
  '1h': 1,
  '6h': 6,
  '24h': 24,
  '7d': 24 * 7,
}

export function historyRangeBounds(range: HistoryTimeRange): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date(to.getTime() - RANGE_HOURS[range] * 60 * 60 * 1000)
  return { from, to }
}

export function resolutionForRange(range: HistoryTimeRange): 'raw' | 'hourly' | 'daily' {
  if (range === '7d') return 'hourly'
  return 'raw'
}

function maxDiskPercent(snap: MetricsSnapshot): number {
  const disks = snap.payload.diskUsage ?? []
  if (!disks.length) return 0
  return Math.max(...disks.map((d) => d.usePercent))
}

function memoryPercent(snap: MetricsSnapshot): number {
  const { usedMemory, totalMemory } = snap.payload
  return totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0
}

function pointFromSample(s: MetricsSnapshot, value: number): HistoryPoint {
  return { at: s.collectedAt, value, sample: s }
}

export function cpuSeries(samples: MetricsSnapshot[]): HistoryPoint[] {
  return samples.map((s) => pointFromSample(s, s.payload.cpuLoad))
}

export function memorySeries(samples: MetricsSnapshot[]): HistoryPoint[] {
  return samples.map((s) => pointFromSample(s, memoryPercent(s)))
}

export function diskSeries(samples: MetricsSnapshot[]): HistoryPoint[] {
  return samples
    .map((s) => pointFromSample(s, maxDiskPercent(s)))
    .filter((p) => p.value > 0)
}

export function containerSeries(samples: MetricsSnapshot[]): HistoryPoint[] {
  return samples.map((s) =>
    pointFromSample(s, (s.payload.containers ?? []).length),
  )
}

const SERVICE_STATUS_RANK: Record<string, number> = {
  RUNNING: 0,
  ERROR: 1,
  STOPPED: 2,
}

export function topProcessesByCpu(snapshot: MetricsSnapshot, limit = 5): ProcessInfo[] {
  const seen = new Map<string, ProcessInfo>()
  for (const proc of snapshot.payload.processInfos ?? []) {
    const key = processLabel(proc.command)
    const existing = seen.get(key)
    if (!existing || proc.cpuUsage > existing.cpuUsage) {
      seen.set(key, proc)
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.cpuUsage - a.cpuUsage || b.memoryUsage - a.memoryUsage)
    .slice(0, limit)
}

export function topServices(snapshot: MetricsSnapshot, limit = 5): ServiceInfo[] {
  const processes = snapshot.payload.processInfos ?? []
  const services = snapshot.payload.serviceInfos ?? []
  const running = services.filter((s) => s.status === 'RUNNING')
  const pool = running.length > 0 ? running : services

  return [...pool]
    .map((service) => {
      const linked = findProcessesForService(service, processes, { limit: 1 })
      const cpu = linked[0]?.proc.cpuUsage ?? 0
      return { service, cpu }
    })
    .sort(
      (a, b) =>
        b.cpu - a.cpu ||
        SERVICE_STATUS_RANK[a.service.status] - SERVICE_STATUS_RANK[b.service.status] ||
        a.service.serviceName.localeCompare(b.service.serviceName),
    )
    .slice(0, limit)
    .map((row) => row.service)
}

export { processLabel, serviceLabel }

export function sortSamplesAsc(samples: MetricsSnapshot[]): MetricsSnapshot[] {
  return [...samples].sort(
    (a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime(),
  )
}

/** Earliest and latest collectedAt in sorted samples (ISO strings). */
export function sampleTimeSpan(samples: MetricsSnapshot[]): { from?: string; to?: string } {
  if (samples.length === 0) return {}
  const sorted = sortSamplesAsc(samples)
  return {
    from: sorted[0]?.collectedAt,
    to: sorted[sorted.length - 1]?.collectedAt,
  }
}

export function formatHistoryTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

/** Index of the sample whose collectedAt is closest to targetMs. */
export function nearestSampleIndex(samples: MetricsSnapshot[], targetMs: number): number {
  if (samples.length === 0) return 0
  let best = 0
  let bestDiff = Infinity
  for (let i = 0; i < samples.length; i++) {
    const t = new Date(samples[i]!.collectedAt).getTime()
    const diff = Math.abs(t - targetMs)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  }
  return best
}

/** Value for input[type=datetime-local] from an ISO timestamp. */
export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function filterSamplesByRange(
  samples: MetricsSnapshot[],
  range: HistoryTimeRange,
): MetricsSnapshot[] {
  const { from, to } = historyRangeBounds(range)
  const fromMs = from.getTime()
  const toMs = to.getTime()
  return samples.filter((s) => {
    const t = new Date(s.collectedAt).getTime()
    return t >= fromMs && t <= toMs
  })
}
