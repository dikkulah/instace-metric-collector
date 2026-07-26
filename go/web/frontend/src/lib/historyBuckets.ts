import type { MetricsSnapshot } from '../api/types'
import type { HistoryTimeRange } from '../context/HistoryViewContext'

export type HistoryBucketMode = 'none' | 'hour' | 'day'

export interface HistoryBucket {
  key: string
  label: string
  sampleIndex: number
  startMs: number
  endMs: number
}

const TWO_DAYS_MS = 2 * 86_400_000

function sampleSpanMs(samples: MetricsSnapshot[]): number {
  if (samples.length < 2) return 0
  const first = new Date(samples[0]!.collectedAt).getTime()
  const last = new Date(samples[samples.length - 1]!.collectedAt).getTime()
  return Math.abs(last - first)
}

export function historyBucketMode(range: HistoryTimeRange, samples: MetricsSnapshot[] = []): HistoryBucketMode {
  if (range === '1h') return 'none'
  if (range === '7d') {
    if (sampleSpanMs(samples) < TWO_DAYS_MS) return 'hour'
    return 'day'
  }
  return 'hour'
}

function truncateToHour(ms: number): number {
  const d = new Date(ms)
  d.setMinutes(0, 0, 0)
  return d.getTime()
}

function truncateToDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function formatHourLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })
}

/** One bucket per hour/day that has at least one sample — empty slots are omitted. */
export function buildHistoryBuckets(
  samples: MetricsSnapshot[],
  range: HistoryTimeRange,
): HistoryBucket[] {
  const mode = historyBucketMode(range, samples)
  if (mode === 'none' || samples.length === 0) return []

  const bucketMs = mode === 'hour' ? 3_600_000 : 86_400_000
  const truncate = mode === 'hour' ? truncateToHour : truncateToDay
  const groups = new Map<number, number[]>()

  for (let idx = 0; idx < samples.length; idx++) {
    const startMs = truncate(new Date(samples[idx]!.collectedAt).getTime())
    const list = groups.get(startMs) ?? []
    list.push(idx)
    groups.set(startMs, list)
  }

  return [...groups.keys()]
    .sort((a, b) => a - b)
    .map((startMs) => {
      const indices = groups.get(startMs)!
      return {
        key: String(startMs),
        label: mode === 'hour' ? formatHourLabel(startMs) : formatDayLabel(startMs),
        sampleIndex: indices[indices.length - 1]!,
        startMs,
        endMs: startMs + bucketMs,
      }
    })
}

export function lastBucketWithDataIndex(buckets: HistoryBucket[]): number {
  return buckets.length > 0 ? buckets.length - 1 : -1
}
