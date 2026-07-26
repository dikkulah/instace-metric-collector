export type AgentConnectionStatus = 'live' | 'stale' | 'offline'

export function agentStatusLabel(
  status: AgentConnectionStatus | string | undefined,
  t: (key: string) => string,
): string {
  switch (status) {
    case 'live':
      return t('hub.status.live')
    case 'stale':
      return t('hub.status.stale')
    case 'offline':
      return t('hub.status.offline')
    default:
      return t('hub.status.live')
  }
}

export function agentStatusTone(status: AgentConnectionStatus | string | undefined): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'live':
      return 'success'
    case 'stale':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function isAgentOffline(status: AgentConnectionStatus | string | undefined): boolean {
  return status === 'offline' || status === 'stale'
}

export type AgentListFilter = 'all' | 'live' | 'offline'

export function matchesAgentFilter(status: AgentConnectionStatus | string | undefined, filter: AgentListFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'live') return status === 'live'
  return status === 'stale' || status === 'offline'
}
