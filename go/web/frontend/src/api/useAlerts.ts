import { useCallback, useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPost } from './client'

export interface AlertRecord {
  id: string
  agentId: string
  ruleId: string
  severity: string
  status: string
  firedAt: string
  resolvedAt?: string
  details: Record<string, unknown>
}

export interface AlertFilters {
  status?: string
  severity?: string
}

export function ackAlert(id: string): Promise<AlertRecord> {
  return apiPost<AlertRecord>(`/api/v1/alerts/${encodeURIComponent(id)}/ack`)
}

export function resolveAlert(id: string): Promise<AlertRecord> {
  return apiPost<AlertRecord>(`/api/v1/alerts/${encodeURIComponent(id)}/resolve`)
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

export function revokeSilence(agentId: string, ruleId: string): Promise<void> {
  const q = new URLSearchParams({ agentId, ruleId })
  return apiDelete(`/api/v1/alerts/silences?${q}`)
}

export function fetchSilences(): Promise<SilenceEntry[]> {
  return apiGet<SilenceEntry[]>('/api/v1/alerts/silences').then((d) => d ?? [])
}

function alertsQuery(agentId?: string, filters?: AlertFilters): string {
  const params = new URLSearchParams()
  if (agentId) params.set('agentId', agentId)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.severity) params.set('severity', filters.severity)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useAlerts(agentId?: string, filters?: AlertFilters) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [ackingId, setAckingId] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [silencingKey, setSilencingKey] = useState<string | null>(null)

  const reload = useCallback(() => {
    return apiGet<AlertRecord[]>(`/api/v1/alerts${alertsQuery(agentId, filters)}`)
      .then((data) => setAlerts(data ?? []))
      .catch(() => setAlerts([]))
  }, [agentId, filters?.status, filters?.severity])

  useEffect(() => {
    void reload()
    const id = window.setInterval(() => void reload(), 10_000)
    return () => window.clearInterval(id)
  }, [reload])

  const acknowledge = useCallback(async (id: string) => {
    setAckingId(id)
    try {
      const updated = await ackAlert(id)
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } finally {
      setAckingId(null)
    }
  }, [])

  const resolve = useCallback(async (id: string) => {
    setResolvingId(id)
    try {
      const updated = await resolveAlert(id)
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } finally {
      setResolvingId(null)
    }
  }, [])

  const silence = useCallback(async (alert: AlertRecord, durationMinutes: number) => {
    const key = `${alert.agentId}|${alert.ruleId}`
    setSilencingKey(key)
    try {
      await silenceAlert(alert.agentId, alert.ruleId, durationMinutes)
    } finally {
      setSilencingKey(null)
    }
  }, [])

  return { alerts, acknowledge, ackingId, resolve, resolvingId, silence, silencingKey, reload }
}

export function useActiveSilences() {
  const [silences, setSilences] = useState<SilenceEntry[]>([])
  const [revokingKey, setRevokingKey] = useState<string | null>(null)

  const reload = useCallback(() => {
    return fetchSilences().then(setSilences).catch(() => setSilences([]))
  }, [])

  useEffect(() => {
    void reload()
    const id = window.setInterval(() => void reload(), 15_000)
    return () => window.clearInterval(id)
  }, [reload])

  const revoke = useCallback(async (entry: SilenceEntry) => {
    const key = `${entry.agentId}|${entry.ruleId}`
    setRevokingKey(key)
    try {
      await revokeSilence(entry.agentId, entry.ruleId)
      await reload()
    } finally {
      setRevokingKey(null)
    }
  }, [reload])

  return { silences, revoke, revokingKey, reload }
}
