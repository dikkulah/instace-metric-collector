import { useMemo } from 'react'
import { useMatch, useParams } from 'react-router-dom'
import { useMeta } from '../api/useMeta'

/** Base path for agent-scoped routes: '' on agent mode, `/hub/agents/:id` on hub drill-down. */
export function useAgentBasePath(): string {
  const { meta } = useMeta()
  const { agentId } = useParams<{ agentId?: string }>()
  const hubAgentMatch = useMatch('/hub/agents/:agentId/*')

  return useMemo(() => {
    if (meta?.mode === 'hub' && (agentId || hubAgentMatch?.params.agentId)) {
      const id = agentId ?? hubAgentMatch?.params.agentId
      return `/hub/agents/${encodeURIComponent(id!)}`
    }
    return ''
  }, [meta?.mode, agentId, hubAgentMatch?.params.agentId])
}

/** Build a path under the current agent or local agent mode root. */
export function useAgentHref(segment?: string, query?: Record<string, string>): string {
  const base = useAgentBasePath()

  let path: string
  if (!segment) {
    path = base || '/'
  } else if (base) {
    path = `${base}/${segment}`
  } else {
    path = `/${segment}`
  }

  if (!query || Object.keys(query).length === 0) {
    return path
  }
  const qs = new URLSearchParams(query).toString()
  return `${path}?${qs}`
}

export function useIsHubAgentContext(): boolean {
  const base = useAgentBasePath()
  return base.startsWith('/hub/agents/')
}
