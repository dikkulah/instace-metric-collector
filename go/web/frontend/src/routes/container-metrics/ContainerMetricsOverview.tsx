import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { MetricCard } from '../../components/MetricCard'
import { StatusPill } from '../../components/StatusPill'
import { formatBytes, formatPercent, isAgentContainer } from '../../lib/format'

/** Container-scoped overview: 3 summary cards + disk/network/containers (Stitch container metrics overview). */
export function ContainerMetricsOverview() {
  const { t } = useTranslation()
  const { snapshot } = useMetricsContext()

  if (!snapshot) return null

  const p = snapshot.payload
  const memPct = p.totalMemory > 0 ? (p.usedMemory / p.totalMemory) * 100 : 0
  const healthy = p.containers.filter((c) => c.health === 'healthy').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <td className="py-2 mono">{d.mount}</td>
                    <td className="py-2 text-on-surface-variant text-xs">{d.filesystem}</td>
                    <td className="py-2 text-right mono">{formatPercent(d.usePercent)}</td>
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
                <tr className="text-left label-caps">
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
                to={`/container-metrics?id=${encodeURIComponent(c.id)}`}
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
