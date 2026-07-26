import { useTranslation } from 'react-i18next'
import { useAlerts } from '../../api/useAlerts'
import { PageShell } from '../../components/layout/PageShell'

export function AlertsPage() {
  const { t } = useTranslation()
  const alerts = useAlerts()

  return (
    <PageShell title={t('nav.alerts')} variant="scroll">
      {alerts.length === 0 ? (
        <div className="panel p-12 text-center text-on-surface-variant text-sm">{t('alerts.empty')}</div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left label-caps border-b border-outline-variant">
                <th className="p-3">{t('alerts.agent')}</th>
                <th className="p-3">{t('alerts.rule')}</th>
                <th className="p-3">{t('alerts.severity')}</th>
                <th className="p-3">{t('alerts.status')}</th>
                <th className="p-3">{t('alerts.firedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-t border-outline-variant/50">
                  <td className="p-3 mono">{a.agentId}</td>
                  <td className="p-3 mono">{a.ruleId}</td>
                  <td className="p-3">{a.severity}</td>
                  <td className="p-3">{a.status}</td>
                  <td className="p-3 text-on-surface-variant">{a.firedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}
