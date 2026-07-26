import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useActiveSilences, useAlerts } from '../../api/useAlerts'
import { useHubAgents } from '../../api/useHubAgents'
import { PageShell } from '../../components/layout/PageShell'
import { PillTabs } from '../../components/PillTabs'
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

type StatusFilter = 'all' | 'OPEN' | 'ACK' | 'RESOLVED'

export function AlertsPage() {
  const { t } = useTranslation()
  const { agentId } = useParams<{ agentId?: string }>()
  const agents = useHubAgents()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const filters = useMemo(
    () => ({ status: statusFilter === 'all' ? undefined : statusFilter }),
    [statusFilter],
  )
  const { alerts, acknowledge, ackingId, resolve, resolvingId, silence, silencingKey, reload } = useAlerts(agentId, filters)
  const { silences, revoke, revokingKey, reload: reloadSilences } = useActiveSilences()
  const agent = agentId ? agents.find((a) => a.agentId === agentId) : undefined
  const showAgentColumn = !agentId

  return (
    <PageShell title={t('nav.alerts')} variant="scroll">
      {agentId && agent && (
        <p className="text-sm text-on-surface-variant -mt-2 mb-4">
          {agent.hostname} <span className="mono text-xs">({agentId})</span>
        </p>
      )}

      <PillTabs
        tabs={[
          { id: 'all' as StatusFilter, label: t('alerts.filter.all') },
          { id: 'OPEN' as StatusFilter, label: t('alerts.status.open') },
          { id: 'ACK' as StatusFilter, label: t('alerts.status.ack') },
          { id: 'RESOLVED' as StatusFilter, label: t('alerts.status.resolved') },
        ]}
        active={statusFilter}
        onChange={setStatusFilter}
      />

      {silences.length > 0 && (
        <details className="panel p-4 mt-4" open>
          <summary className="cursor-pointer font-medium text-sm">{t('alerts.silences.title')}</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left label-caps border-b border-outline-variant">
                  <th className="p-2">{t('alerts.agent')}</th>
                  <th className="p-2">{t('alerts.rule')}</th>
                  <th className="p-2">{t('alerts.silences.until')}</th>
                  <th className="p-2">{t('alerts.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {silences.map((s) => (
                  <tr key={`${s.agentId}|${s.ruleId}`} className="border-t border-outline-variant/50">
                    <td className="p-2 mono">{s.agentId}</td>
                    <td className="p-2 mono">{s.ruleId || t('alerts.silences.allRules')}</td>
                    <td className="p-2 text-on-surface-variant">{new Date(s.until).toLocaleString()}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => void revoke(s)}
                        disabled={revokingKey === `${s.agentId}|${s.ruleId}`}
                        className="px-3 py-1.5 rounded-md text-xs border border-outline-variant hover:bg-surface-high disabled:opacity-50"
                      >
                        {t('alerts.silences.revoke')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {alerts.length === 0 ? (
        <div className="panel p-12 text-center text-on-surface-variant text-sm mt-4">{t('alerts.empty')}</div>
      ) : (
        <div className="panel overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left label-caps border-b border-outline-variant">
                {showAgentColumn && <th className="p-3">{t('alerts.agent')}</th>}
                <th className="p-3">{t('alerts.rule')}</th>
                <th className="p-3">{t('alerts.severity')}</th>
                <th className="p-3">{t('alerts.status')}</th>
                <th className="p-3">{t('alerts.firedAt')}</th>
                <th className="p-3">{t('alerts.resolvedAt')}</th>
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
                  <td className="p-3 text-on-surface-variant">{a.resolvedAt ?? '—'}</td>
                  <td className="p-3">
                    {a.status === 'OPEN' ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void acknowledge(a.id)}
                          disabled={ackingId === a.id}
                          className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary-container/30 text-primary hover:bg-primary-container/50 disabled:opacity-50"
                        >
                          {ackingId === a.id ? t('alerts.acking') : t('alerts.ack')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void resolve(a.id)}
                          disabled={resolvingId === a.id}
                          className="px-3 py-1.5 rounded-md text-xs font-medium border border-outline-variant hover:bg-surface-container disabled:opacity-50"
                        >
                          {resolvingId === a.id ? t('alerts.resolving') : t('alerts.resolve')}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await silence(a, 60)
                            await reload()
                            await reloadSilences()
                          }}
                          disabled={silencingKey === `${a.agentId}|${a.ruleId}`}
                          className="px-3 py-1.5 rounded-md text-xs font-medium border border-outline-variant hover:bg-surface-container disabled:opacity-50"
                        >
                          {silencingKey === `${a.agentId}|${a.ruleId}`
                            ? t('alerts.silencing')
                            : `${t('alerts.silence')} (${t('alerts.silence1h')})`}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await silence(a, 24 * 60)
                            await reload()
                            await reloadSilences()
                          }}
                          disabled={silencingKey === `${a.agentId}|${a.ruleId}`}
                          className="px-3 py-1.5 rounded-md text-xs font-medium border border-outline-variant hover:bg-surface-container disabled:opacity-50"
                        >
                          {t('alerts.silence24h')}
                        </button>
                      </div>
                    ) : a.status === 'ACK' ? (
                      <button
                        type="button"
                        onClick={() => void resolve(a.id)}
                        disabled={resolvingId === a.id}
                        className="px-3 py-1.5 rounded-md text-xs font-medium border border-outline-variant hover:bg-surface-container disabled:opacity-50"
                      >
                        {resolvingId === a.id ? t('alerts.resolving') : t('alerts.resolve')}
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
