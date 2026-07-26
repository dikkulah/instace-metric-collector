import { Outlet, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHubAgentMetrics } from '../../api/useHubAgentMetrics'
import { MetricsContext } from '../../context/MetricsContext'
import { EmptyState } from '../../components/EmptyState'

export function HubAgentLayout() {
  const { t } = useTranslation()
  const { agentId } = useParams<{ agentId: string }>()
  const metrics = useHubAgentMetrics(agentId)

  if (!agentId) {
    return <EmptyState message={t('hub.agent.missingId')} />
  }

  return (
    <MetricsContext.Provider value={metrics}>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <Outlet />
      </div>
    </MetricsContext.Provider>
  )
}
