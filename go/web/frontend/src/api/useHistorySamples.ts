import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGet } from './client'
import type { MetricsSnapshot } from './types'
import { useIsHubAgentContext } from '../hooks/useAgentBasePath'
import type { HistoryTimeRange } from '../context/HistoryViewContext'
import {
  filterSamplesByRange,
  historyRangeBounds,
  resolutionForRange,
  sortSamplesAsc,
} from '../lib/historySeries'
import { normalizeMetricsSnapshot } from '../lib/normalizeMetrics'

export function useHistorySamples(timeRange: HistoryTimeRange, enabled: boolean, sampleLimit: number) {
  const { agentId } = useParams<{ agentId?: string }>()
  const isHubAgent = useIsHubAgentContext()
  const [samples, setSamples] = useState<MetricsSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setSamples([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        let data: MetricsSnapshot[]
        if (isHubAgent && agentId) {
          const { from, to } = historyRangeBounds(timeRange)
          const qs = new URLSearchParams({
            from: from.toISOString(),
            to: to.toISOString(),
            resolution: resolutionForRange(timeRange),
            limit: String(sampleLimit),
          })
          data =
            (await apiGet<MetricsSnapshot[]>(
              `/api/v1/agents/${encodeURIComponent(agentId)}/history?${qs}`,
            )) ?? []
        } else {
          const raw =
            (await apiGet<MetricsSnapshot[]>(
              `/api/metrics/history?limit=${encodeURIComponent(String(sampleLimit))}`,
            )) ?? []
          data = filterSamplesByRange(raw, timeRange)
        }
        if (!cancelled) {
          setSamples(sortSamplesAsc(data.map(normalizeMetricsSnapshot)))
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'history error')
          setSamples([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const id = window.setInterval(() => void load(), 30_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, timeRange, isHubAgent, agentId, sampleLimit])

  return { samples, loading, error, sampleLimit }
}
