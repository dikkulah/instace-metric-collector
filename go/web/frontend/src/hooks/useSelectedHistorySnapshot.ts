import { useEffect, useMemo, useState } from 'react'
import { useHistorySamples } from '../api/useHistorySamples'
import type { MetricsSnapshot } from '../api/types'
import { useHistoryView } from '../context/HistoryViewContext'
import { sortSamplesAsc } from '../lib/historySeries'

export function useSelectedHistorySnapshot(enabled: boolean) {
  const { timeRange, setTimeRange } = useHistoryView()
  const { samples, loading, error } = useHistorySamples(timeRange, enabled)
  const sorted = useMemo(() => sortSamplesAsc(samples), [samples])
  const [sampleIndex, setSampleIndex] = useState(0)

  useEffect(() => {
    setSampleIndex(0)
  }, [timeRange, sorted.length])

  const safeIndex =
    sorted.length === 0 ? 0 : Math.min(Math.max(sampleIndex, 0), sorted.length - 1)

  const snapshot: MetricsSnapshot | null = sorted.length > 0 ? sorted[safeIndex]! : null

  return {
    timeRange,
    setTimeRange,
    samples: sorted,
    sampleIndex: safeIndex,
    setSampleIndex,
    snapshot,
    loading,
    error,
  }
}
