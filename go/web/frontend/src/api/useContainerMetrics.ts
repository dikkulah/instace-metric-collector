import { useEffect, useState } from 'react'
import { apiGet } from './client'
import type { MetricsSnapshot } from './types'

export function useContainerMetrics(containerId: string | null) {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!containerId) {
      setSnapshot(null)
      setUnavailable(false)
      return
    }
    setLoading(true)
    apiGet<MetricsSnapshot>(`/api/containers/${encodeURIComponent(containerId)}/metrics/current`)
      .then((snap) => {
        if (snap) {
          setSnapshot(snap)
          setUnavailable(false)
        } else {
          setUnavailable(true)
        }
      })
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false))
  }, [containerId])

  return { snapshot, unavailable, loading }
}
