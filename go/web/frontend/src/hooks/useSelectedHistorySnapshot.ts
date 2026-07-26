import { useEffect, useMemo, useState } from 'react'
import { useHistorySamples } from '../api/useHistorySamples'
import type { MetricsSnapshot } from '../api/types'
import { useHistoryView } from '../context/HistoryViewContext'
import {
  buildHistoryBuckets,
  historyBucketMode,
  lastBucketWithDataIndex,
  type HistoryBucket,
} from '../lib/historyBuckets'
import { sortSamplesAsc } from '../lib/historySeries'

export function useSelectedHistorySnapshot(enabled: boolean) {
  const { timeRange, setTimeRange, sampleLimit } = useHistoryView()
  const { samples, loading, error } = useHistorySamples(timeRange, enabled, sampleLimit)
  const sorted = useMemo(() => sortSamplesAsc(samples), [samples])
  const bucketMode = historyBucketMode(timeRange, sorted)
  const buckets = useMemo(() => buildHistoryBuckets(sorted, timeRange), [sorted, timeRange])
  const [bucketIndex, setBucketIndex] = useState(0)

  useEffect(() => {
    if (bucketMode === 'none') return
    const last = lastBucketWithDataIndex(buckets)
    setBucketIndex(last >= 0 ? last : 0)
  }, [timeRange, sorted.length, buckets, bucketMode])

  const sampleIndex = useMemo(() => {
    if (sorted.length === 0) return 0
    if (bucketMode === 'none') return sorted.length - 1
    const bucket = buckets[bucketIndex]
    if (bucket) return bucket.sampleIndex
    return sorted.length - 1
  }, [bucketMode, sorted, buckets, bucketIndex])

  const snapshot: MetricsSnapshot | null = sorted.length > 0 ? sorted[sampleIndex]! : null

  return {
    timeRange,
    setTimeRange,
    samples: sorted,
    sampleIndex,
    snapshot,
    loading,
    error,
    sampleLimit,
    bucketMode,
    buckets,
    bucketIndex,
    setBucketIndex,
  }
}

export type SelectedHistorySnapshot = ReturnType<typeof useSelectedHistorySnapshot>
export type { HistoryBucket }
