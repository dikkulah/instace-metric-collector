import { useEffect, useState } from 'react'
import { apiGet } from './client'

export interface HubStatsSnapshot {
  agentCount: number
  ingestTotal: number
  ingestErrors: number
  alertDispatched: number
  alertFailed: number
  alertQueueDepth: number
}

const defaults: HubStatsSnapshot = {
  agentCount: 0,
  ingestTotal: 0,
  ingestErrors: 0,
  alertDispatched: 0,
  alertFailed: 0,
  alertQueueDepth: 0,
}

export function useHubStats() {
  const [stats, setStats] = useState<HubStatsSnapshot>(defaults)

  useEffect(() => {
    const load = () => {
      apiGet<HubStatsSnapshot>('/api/v1/hub/stats')
        .then((data) => {
          if (data) setStats({ ...defaults, ...data })
        })
        .catch(() => {})
    }
    load()
    const id = window.setInterval(load, 10_000)
    return () => window.clearInterval(id)
  }, [])

  return stats
}
