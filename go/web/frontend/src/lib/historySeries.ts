import type { MetricsSnapshot } from '../api/types'
import type { HistoryTimeRange } from '../context/HistoryViewContext'

export interface HistoryPoint {
  at: string
  value: number
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

export function resolutionForRange(range: HistoryTimeRange): 'raw' | 'hourly' {
  return range === '7d' ? 'hourly' : 'raw'
}

function maxDiskPercent(snap: MetricsSnapshot): number {
  if (!snap.payload.diskUsage.length) return 0
  return Math.max(...snap.payload.diskUsage.map((d) => d.usePercent))
}

function memoryPercent(snap: MetricsSnapshot): number {
  const { usedMemory, totalMemory } = snap.payload
  return totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0
}

export function cpuSeries(samples: MetricsSnapshot[]): HistoryPoint[] {
  return samples.map((s) => ({ at: s.collectedAt, value: s.payload.cpuLoad }))
}

export function memorySeries(samples: MetricsSnapshot[]): HistoryPoint[] {
  return samples.map((s) => ({ at: s.collectedAt, value: memoryPercent(s) }))
}

export function diskSeries(samples: MetricsSnapshot[]): HistoryPoint[] {
  return samples
    .map((s) => ({ at: s.collectedAt, value: maxDiskPercent(s) }))
    .filter((p) => p.value > 0)
}

export function containerSeries(samples: MetricsSnapshot[]): HistoryPoint[] {
  return samples.map((s) => ({ at: s.collectedAt, value: s.payload.containers.length }))
}

export function sortSamplesAsc(samples: MetricsSnapshot[]): MetricsSnapshot[] {
  return [...samples].sort(
    (a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime(),
  )
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
