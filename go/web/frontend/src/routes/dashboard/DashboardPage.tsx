import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { MetricCard } from '../../components/MetricCard'
import { EmptyState } from '../../components/EmptyState'
import { StatusPill } from '../../components/StatusPill'
import { formatBytes, formatPercent, isAgentContainer } from '../../lib/format'

export function DashboardPage() {
  const { t } = useTranslation()
  const { snapshot } = useMetricsContext()

  if (!snapshot) {
    return <EmptyState message={t('app.waiting')} />
  }

  const p = snapshot.payload
  const memPct = p.totalMemory > 0 ? (p.usedMemory / p.totalMemory) * 100 : 0
  const healthy = p.containers.filter((c) => c.health === 'healthy').length
  const loadPct = p.availableProcessors > 0 ? (p.systemLoadAverage / p.availableProcessors) * 100 : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('nav.dashboard')}</h1>
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
          label="Load"
          value={p.systemLoadAverage.toFixed(2)}
          percent={loadPct}
          subtitle={`${p.availableProcessors} CPUs`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="panel p-5">
          <h2 className="label-caps mb-4">Disk</h2>
          <div className="space-y-3">
            {p.diskUsage.map((d) => (
              <div key={d.mount}>
                <div className="flex justify-between text-sm mb-1 gap-2">
                  <span className="mono">{d.mount}</span>
                  <span className="text-on-surface-variant text-xs">{d.filesystem}</span>
                  <span className="mono">{formatPercent(d.usePercent)}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-highest">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: `${d.usePercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="label-caps mb-4">Network</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left label-caps">
                  <th className="pb-2">Interface</th>
                  <th className="pb-2 text-right">RX</th>
                  <th className="pb-2 text-right">TX</th>
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
        <section className="panel p-5">
          <h2 className="label-caps mb-4">{t('card.containers')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {p.containers.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to={`/containers`}
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
    </div>
  )
}
