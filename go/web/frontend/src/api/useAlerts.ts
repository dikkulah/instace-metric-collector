import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost } from './client'

export interface AlertRecord {
  id: string
  agentId: string
  ruleId: string
  severity: string
  status: string
  firedAt: string
  details: Record<string, unknown>
}

export function ackAlert(id: string): Promise<AlertRecord> {
  return apiPost<AlertRecord>(`/api/v1/alerts/${encodeURIComponent(id)}/ack`)
}

export function useAlerts(agentId?: string) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [ackingId, setAckingId] = useState<string | null>(null)

  const reload = useCallback(() => {
    const q = agentId ? `?agentId=${encodeURIComponent(agentId)}` : ''
    return apiGet<AlertRecord[]>(`/api/v1/alerts${q}`)
      .then((data) => setAlerts(data ?? []))
      .catch(() => setAlerts([]))
  }, [agentId])

  useEffect(() => {
    void reload()
    const id = window.setInterval(() => void reload(), 10_000)
    return () => window.clearInterval(id)
  }, [reload])

  const acknowledge = useCallback(
    async (id: string) => {
      setAckingId(id)
      try {
        const updated = await ackAlert(id)
        setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)))
      } finally {
        setAckingId(null)
      }
    },
    [],
  )

  return { alerts, acknowledge, ackingId, reload }
}
