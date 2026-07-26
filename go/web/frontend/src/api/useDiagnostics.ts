import { useEffect, useState } from 'react'
import { apiGet } from './client'
import type { DiagnosticItem } from '../components/DiagnosticPanel'

export function useDiagnostics(agentId: string | undefined) {
  const [items, setItems] = useState<DiagnosticItem[]>([])

  useEffect(() => {
    if (!agentId) {
      setItems([])
      return
    }
    const load = () => {
      apiGet<DiagnosticItem[]>(`/api/v1/agents/${encodeURIComponent(agentId)}/diagnostics`)
        .then((data) => setItems(data ?? []))
        .catch(() => setItems([]))
    }
    load()
    const id = window.setInterval(load, 10000)
    return () => window.clearInterval(id)
  }, [agentId])

  return items
}
