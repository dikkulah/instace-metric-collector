import { useEffect, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHubAgentMetrics } from '../../api/useHubAgentMetrics'
import { useHubAgents } from '../../api/useHubAgents'
import { MetricsContext } from '../../context/MetricsContext'
import { useHistoryView } from '../../context/HistoryViewContext'
import { EmptyState } from '../../components/EmptyState'
import { isAgentOffline } from '../../lib/agentStatus'

export function HubAgentLayout() {
  const { t } = useTranslation()
  const { agentId } = useParams<{ agentId: string }>()
  const metrics = useHubAgentMetrics(agentId)
  const agents = useHubAgents()
  const { setViewMode } = useHistoryView()

  const agent = useMemo(
    () => agents.find((a) => a.agentId === agentId),
    [agents, agentId],
  )

  useEffect(() => {
    if (isAgentOffline(agent?.status)) {
      setViewMode('history')
    }
  }, [agent?.status, setViewMode])

  if (!agentId) {
    return <EmptyState message={t('hub.agent.missingId')} />
  }

  return (
    <MetricsContext.Provider value={metrics}>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        {isAgentOffline(agent?.status) && agent?.lastSeen && (
          <div className="shrink-0 mb-3 panel px-4 py-2 text-sm text-on-surface-variant border-l-4 border-warning">
            {t('hub.lastDataAt')}: <span className="mono">{new Date(agent.lastSeen).toLocaleString()}</span>
          </div>
        )}
        <Outlet />
      </div>
    </MetricsContext.Provider>
  )
}
