import { useEffect, useState } from 'react'
import { apiGet } from './client'
import type { MetricsSnapshot } from './types'

export function useHubAgentMetrics(agentId: string | undefined) {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null)
  const [live, setLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (!agentId) return
    const load = () => {
      apiGet<MetricsSnapshot>(`/api/v1/agents/${encodeURIComponent(agentId)}/current`)
        .then((data) => {
          if (data) {
            setSnapshot(data)
            setLive(true)
            setLastUpdate(new Date(data.collectedAt))
          }
        })
        .catch(() => setLive(false))
    }
    load()
    const id = window.setInterval(load, 5000)
    return () => window.clearInterval(id)
  }, [agentId])

  return { snapshot, live, lastUpdate }
}
