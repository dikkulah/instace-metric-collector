import { useCallback, useEffect, useState } from 'react'
import { apiGet } from './client'
import type { MetricsSnapshot } from './types'

export function useMetrics() {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null)
  const [live, setLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const apply = useCallback((snap: MetricsSnapshot) => {
    setSnapshot(snap)
    setLive(true)
    setLastUpdate(new Date(snap.collectedAt))
  }, [])

  useEffect(() => {
    apiGet<MetricsSnapshot>('/api/metrics/current')
      .then((snap) => { if (snap) apply(snap) })
      .catch(() => setLive(false))
  }, [apply])

  useEffect(() => {
    const es = new EventSource('/api/metrics/stream')
    es.addEventListener('metrics', (ev) => {
      try {
        apply(JSON.parse((ev as MessageEvent).data) as MetricsSnapshot)
      } catch { /* ignore */ }
    })
    es.onerror = () => setLive(false)
    return () => es.close()
  }, [apply])

  return { snapshot, live, lastUpdate }
}
