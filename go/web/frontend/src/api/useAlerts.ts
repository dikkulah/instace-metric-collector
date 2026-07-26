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

export interface SilenceEntry {
  agentId: string
  ruleId: string
  until: string
  createdAt: string
}

export function silenceAlert(agentId: string, ruleId: string, durationMinutes: number): Promise<SilenceEntry> {
  return apiPost<SilenceEntry>('/api/v1/alerts/silence', {
    agentId,
    ruleId,
    durationMinutes,
  })
}

export function useAlerts(agentId?: string) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [ackingId, setAckingId] = useState<string | null>(null)
  const [silencingKey, setSilencingKey] = useState<string | null>(null)

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

  const silence = useCallback(async (alert: AlertRecord, durationMinutes: number) => {
    const key = `${alert.agentId}|${alert.ruleId}`
    setSilencingKey(key)
    try {
      await silenceAlert(alert.agentId, alert.ruleId, durationMinutes)
    } finally {
      setSilencingKey(null)
    }
  }, [])

  return { alerts, acknowledge, ackingId, silence, silencingKey, reload }
}
