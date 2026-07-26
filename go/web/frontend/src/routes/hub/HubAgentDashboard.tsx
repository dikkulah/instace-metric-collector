import { DashboardPage } from '../dashboard/DashboardPage'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAlerts } from '../../api/useAlerts'
import { StatusPill } from '../../components/StatusPill'

export function HubAgentDashboard() {
  const { t } = useTranslation()
  const { agentId } = useParams<{ agentId: string }>()
  const { alerts, acknowledge, ackingId } = useAlerts(agentId)

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
      <DashboardPage />
      {alerts.length > 0 && (
        <section className="panel p-4 space-y-2">
          <h2 className="label-caps">{t('nav.alerts')}</h2>
          <ul className="text-sm space-y-2">
            {alerts.slice(0, 10).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/50 pb-2"
              >
                <span className="mono">{a.ruleId}</span>
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant">{a.severity}</span>
                  <StatusPill
                    label={a.status === 'OPEN' ? t('alerts.status.open') : t('alerts.status.ack')}
                    tone={a.status === 'OPEN' ? 'warning' : 'success'}
                  />
                  {a.status === 'OPEN' && (
                    <button
                      type="button"
                      onClick={() => void acknowledge(a.id)}
                      disabled={ackingId === a.id}
                      className="px-2 py-1 rounded text-xs bg-primary-container/30 text-primary hover:bg-primary-container/50 disabled:opacity-50"
                    >
                      {ackingId === a.id ? t('alerts.acking') : t('alerts.ack')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
