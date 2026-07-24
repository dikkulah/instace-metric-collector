import { useEffect, useState } from 'react'
import { apiGet } from './client'
import type { AgentSummary } from './types'

export function useHubAgents() {
  const [agents, setAgents] = useState<AgentSummary[]>([])

  useEffect(() => {
    const load = () => {
      apiGet<AgentSummary[]>('/api/v1/agents')
        .then((data) => setAgents(data ?? []))
        .catch(() => setAgents([]))
    }
    load()
    const id = window.setInterval(load, 5000)
    return () => window.clearInterval(id)
  }, [])

  return agents
}
