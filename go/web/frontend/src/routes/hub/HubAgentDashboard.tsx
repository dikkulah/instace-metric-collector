import { DashboardPage } from '../dashboard/DashboardPage'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAlerts } from '../../api/useAlerts'

export function HubAgentDashboard() {
  const { t } = useTranslation()
  const { agentId } = useParams<{ agentId: string }>()
  const alerts = useAlerts(agentId)

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
      <DashboardPage />
      {alerts.length > 0 && (
        <section className="panel p-4 space-y-2">
          <h2 className="label-caps">{t('nav.alerts')}</h2>
          <ul className="text-sm space-y-2">
            {alerts.slice(0, 10).map((a) => (
              <li key={a.id} className="flex justify-between gap-2 border-b border-outline-variant/50 pb-2">
                <span className="mono">{a.ruleId}</span>
                <span className="text-on-surface-variant">{a.severity}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
