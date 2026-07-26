import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { useHistoryView } from '../../context/HistoryViewContext'
import { useAgentHref } from '../../hooks/useAgentBasePath'
import { MetricCard, barFillClass } from '../../components/MetricCard'
import { EmptyState } from '../../components/EmptyState'
import { StatusPill } from '../../components/StatusPill'
import { PageShell } from '../../components/layout/PageShell'
import { DashboardHistoryView } from './DashboardHistoryView'
import { formatBytes, formatPercent, isAgentContainer } from '../../lib/format'

export function DashboardPage() {
  const { t } = useTranslation()
  const { viewMode } = useHistoryView()
  const { snapshot } = useMetricsContext()
  const containersHref = useAgentHref('containers')

  if (viewMode === 'history') {
    return <DashboardHistoryView />
  }

  if (!snapshot) {
    return <EmptyState message={t('app.waiting')} />
  }

  const p = snapshot.payload
  const memPct = p.totalMemory > 0 ? (p.usedMemory / p.totalMemory) * 100 : 0
  const healthy = p.containers.filter((c) => c.health === 'healthy').length
  const loadPct = p.availableProcessors > 0 ? (p.systemLoadAverage / p.availableProcessors) * 100 : 0

  return (
    <PageShell title={t('nav.dashboard')} variant="scroll">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label={t('card.cpu')} value={formatPercent(p.cpuLoad)} percent={p.cpuLoad} />
        <MetricCard
          label={t('card.memory')}
          value={formatPercent(memPct)}
          percent={memPct}
          subtitle={`${formatBytes(p.usedMemory)} / ${formatBytes(p.totalMemory)}`}
        />
        <MetricCard
          label={t('card.containers')}
          value={String(p.containers.length)}
          percent={p.containers.length ? (healthy / p.containers.length) * 100 : 0}
          subtitle={`${healthy} ${t('card.healthy')}`}
        />
        <MetricCard
          label={t('card.load')}
          value={p.systemLoadAverage.toFixed(2)}
          percent={loadPct}
          subtitle={t('cpu.coresActive', { active: p.availableProcessors, total: p.availableProcessors })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="panel p-4">
          <h2 className="label-caps mb-4">{t('section.disk')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left label-caps border-b border-outline-variant">
                  <th className="pb-2">{t('table.mount')}</th>
                  <th className="pb-2">{t('table.name')}</th>
                  <th className="pb-2 text-right">{t('table.used')}</th>
                  <th className="pb-2 text-right">{t('table.total')}</th>
                </tr>
              </thead>
              <tbody>
                {p.diskUsage.map((d) => (
                  <tr key={d.mount} className="border-t border-outline-variant/50">
                    <td className="py-2 mono max-w-[10rem] truncate" title={d.mount}>
                      {d.mount}
                    </td>
                    <td className="py-2 text-on-surface-variant text-xs">{d.filesystem}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="hidden sm:block w-20 h-1.5 rounded-full bg-surface-highest overflow-hidden shrink-0">
                          <div
                            className={`h-full ${barFillClass(d.usePercent)}`}
                            style={{ width: `${Math.min(d.usePercent, 100)}%` }}
                          />
                        </div>
                        <span className="mono text-right w-12 shrink-0">{formatPercent(d.usePercent)}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right mono text-on-surface-variant">
                      {formatBytes(d.totalBytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel p-4">
          <h2 className="label-caps mb-4">{t('section.network')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left label-caps border-b border-outline-variant">
                  <th className="pb-2">{t('table.name')}</th>
                  <th className="pb-2 text-right">{t('table.rx')}</th>
                  <th className="pb-2 text-right">{t('table.tx')}</th>
                </tr>
              </thead>
              <tbody>
                {p.networkUsage.map((n) => (
                  <tr key={n.name} className="border-t border-outline-variant/50">
                    <td className="py-2 mono">{n.name}</td>
                    <td className="py-2 text-right mono">{formatBytes(n.bytesReceived)}</td>
                    <td className="py-2 text-right mono">{formatBytes(n.bytesSent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {p.containers.length > 0 && (
        <section className="panel p-4">
          <h2 className="label-caps mb-4">{t('section.docker')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {p.containers.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to={`${containersHref}?id=${encodeURIComponent(c.id)}`}
                className="p-3 rounded-lg border border-outline-variant hover:bg-surface-high"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  {isAgentContainer(c) && (
                    <span className="text-xs text-tertiary">{t('containers.metrics.agentShort')}</span>
                  )}
                </div>
                <StatusPill label={c.health || c.status} tone={c.health === 'healthy' ? 'success' : 'neutral'} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  )
}
