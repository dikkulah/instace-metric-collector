import { useEffect, useState } from 'react'
import { apiGet } from './client'

export interface AlertRecord {
  id: string
  agentId: string
  ruleId: string
  severity: string
  status: string
  firedAt: string
  details: Record<string, unknown>
}

export function useAlerts(agentId?: string) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([])

  useEffect(() => {
    const q = agentId ? `?agentId=${encodeURIComponent(agentId)}` : ''
    const load = () => {
      apiGet<AlertRecord[]>(`/api/v1/alerts${q}`)
        .then((data) => setAlerts(data ?? []))
        .catch(() => setAlerts([]))
    }
    load()
    const id = window.setInterval(load, 10000)
    return () => window.clearInterval(id)
  }, [agentId])

  return alerts
}
