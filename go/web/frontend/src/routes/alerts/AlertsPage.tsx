import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAlerts } from '../../api/useAlerts'
import { useHubAgents } from '../../api/useHubAgents'
import { PageShell } from '../../components/layout/PageShell'
import { StatusPill } from '../../components/StatusPill'

function alertStatusTone(status: string): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'OPEN':
      return 'warning'
    case 'ACK':
      return 'success'
    default:
      return 'neutral'
  }
}

function alertStatusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'OPEN':
      return t('alerts.status.open')
    case 'ACK':
      return t('alerts.status.ack')
    case 'RESOLVED':
      return t('alerts.status.resolved')
    default:
      return status
  }
}

export function AlertsPage() {
  const { t } = useTranslation()
  const { agentId } = useParams<{ agentId?: string }>()
  const agents = useHubAgents()
  const { alerts, acknowledge, ackingId } = useAlerts(agentId)
  const agent = agentId ? agents.find((a) => a.agentId === agentId) : undefined
  const showAgentColumn = !agentId

  return (
    <PageShell title={t('nav.alerts')} variant="scroll">
      {agentId && agent && (
        <p className="text-sm text-on-surface-variant -mt-2 mb-4">
          {agent.hostname} <span className="mono text-xs">({agentId})</span>
        </p>
      )}
      {alerts.length === 0 ? (
        <div className="panel p-12 text-center text-on-surface-variant text-sm">{t('alerts.empty')}</div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left label-caps border-b border-outline-variant">
                {showAgentColumn && <th className="p-3">{t('alerts.agent')}</th>}
                <th className="p-3">{t('alerts.rule')}</th>
                <th className="p-3">{t('alerts.severity')}</th>
                <th className="p-3">{t('alerts.status')}</th>
                <th className="p-3">{t('alerts.firedAt')}</th>
                <th className="p-3">{t('alerts.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-t border-outline-variant/50">
                  {showAgentColumn && <td className="p-3 mono">{a.agentId}</td>}
                  <td className="p-3 mono">{a.ruleId}</td>
                  <td className="p-3">{a.severity}</td>
                  <td className="p-3">
                    <StatusPill label={alertStatusLabel(a.status, t)} tone={alertStatusTone(a.status)} />
                  </td>
                  <td className="p-3 text-on-surface-variant">{a.firedAt}</td>
                  <td className="p-3">
                    {a.status === 'OPEN' ? (
                      <button
                        type="button"
                        onClick={() => void acknowledge(a.id)}
                        disabled={ackingId === a.id}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary-container/30 text-primary hover:bg-primary-container/50 disabled:opacity-50"
                      >
                        {ackingId === a.id ? t('alerts.acking') : t('alerts.ack')}
                      </button>
                    ) : (
                      <span className="text-on-surface-variant text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}
