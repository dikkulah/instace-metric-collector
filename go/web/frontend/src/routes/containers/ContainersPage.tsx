import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { useContainerMetrics } from '../../api/useContainerMetrics'
import { EmptyState } from '../../components/EmptyState'
import { PillTabs } from '../../components/PillTabs'
import { StatusPill } from '../../components/StatusPill'
import { CopyButton } from '../../components/CopyButton'
import { DefinitionList } from '../../components/DefinitionList'
import { MetricCard } from '../../components/MetricCard'
import { MetricsContext } from '../../context/MetricsContext'
import type { ContainerInfo } from '../../api/types'
import { formatBytes, formatPercent, isAgentContainer } from '../../lib/format'
import { ProcessesPage } from '../processes/ProcessesPage'
import { ServicesPage } from '../services/ServicesPage'

type Tab = 'overview' | 'processes' | 'services'

function agentDashboardUrl(c: ContainerInfo): string | null {
  for (const p of c.ports) {
    const m = p.match(/^(\d+):8080\/tcp$/)
    if (m) return `http://127.0.0.1:${m[1]}/`
  }
  return null
}

function ContainerRow({
  c,
  selected,
  onSelect,
}: {
  c: ContainerInfo
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const agent = isAgentContainer(c)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 border-b border-outline-variant/40 hover:bg-surface-high ${
        selected ? 'bg-primary-container/15 border-l-2 border-l-primary' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="font-medium text-sm break-all">{c.name}</span>
        {agent && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/30">
            {t('containers.metrics.agentShort')}
          </span>
        )}
        <StatusPill label={c.status} tone={c.status === 'running' ? 'success' : 'neutral'} pulse={c.status === 'running'} />
        {c.health && c.health !== 'none' && (
          <StatusPill label={c.health} tone={c.health === 'healthy' ? 'success' : 'warning'} />
        )}
        <span className="text-xs mono text-on-surface-variant">↻ {c.restartCount}</span>
      </div>
      <div className="text-xs mono text-on-surface-variant">{c.image}</div>
      <div className="flex flex-wrap gap-1 mt-2">
        {c.ports.map((p) => (
          <span key={p} className="text-xs mono px-2 py-0.5 rounded bg-surface-highest border border-outline-variant">
            {p}
          </span>
        ))}
      </div>
    </button>
  )
}

function ContainerOverview({
  c,
  agentMetrics,
}: {
  c: ContainerInfo
  agentMetrics: ReturnType<typeof useContainerMetrics>
}) {
  const { t } = useTranslation()
  const { snapshot: hostSnap } = useMetricsContext()
  const peers = (hostSnap?.payload.containers ?? []).filter(
    (x) => x.composeProject && x.composeProject === c.composeProject && x.id !== c.id,
  )
  const agent = isAgentContainer(c)
  const dashUrl = agentDashboardUrl(c)
  const m = agentMetrics.snapshot?.payload

  return (
    <div className="space-y-4">
      <DefinitionList
        items={[
          { label: 'ID', value: <span className="flex items-center gap-2">{c.id.slice(0, 12)}… <CopyButton value={c.id} /></span> },
          { label: 'Image', value: c.image },
          { label: 'Status', value: c.status },
          { label: 'Health', value: c.health || '—' },
          { label: 'Restarts', value: String(c.restartCount) },
          { label: 'Compose', value: `${c.composeProject || '—'} / ${c.composeService || '—'}` },
        ]}
      />
      {agent && m && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard label={t('card.cpu')} value={formatPercent(m.cpuLoad)} percent={m.cpuLoad} />
          <MetricCard
            label={t('card.memory')}
            value={formatPercent(m.totalMemory ? (m.usedMemory / m.totalMemory) * 100 : 0)}
            percent={m.totalMemory ? (m.usedMemory / m.totalMemory) * 100 : 0}
            subtitle={`${formatBytes(m.usedMemory)}`}
          />
          <MetricCard label={t('section.processes')} value={String(m.processInfos.length)} />
        </div>
      )}
      {peers.length > 0 && (
        <section className="panel p-4">
          <h3 className="label-caps mb-2">{t('containers.detail.composePeers')}</h3>
          <p className="text-xs text-on-surface-variant mb-3">{t('containers.detail.composePeersHint')}</p>
          <table className="w-full text-sm">
            <tbody>
              {peers.map((p) => (
                <tr key={p.id} className="border-t border-outline-variant/40">
                  <td className="py-2 mono">{p.name}</td>
                  <td className="py-2 text-right">
                    <Link to={`/containers`} className="text-primary text-xs">{t('containers.detail.viewFull')}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {agent && dashUrl && (
        <a href={dashUrl} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary hover:underline">
          {t('containers.detail.openAgentDashboard')}
        </a>
      )}
    </div>
  )
}

function ContainerDetail({ c }: { c: ContainerInfo }) {
  const { t } = useTranslation()
  const agent = isAgentContainer(c)
  const [tab, setTab] = useState<Tab>('overview')
  const agentMetrics = useContainerMetrics(agent ? c.id : null)
  const metricsCtx = agentMetrics.snapshot
    ? { snapshot: agentMetrics.snapshot, live: !agentMetrics.unavailable, lastUpdate: new Date(agentMetrics.snapshot.collectedAt) }
    : null

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="panel p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <StatusPill label={c.health || c.status} tone={c.health === 'healthy' ? 'success' : 'neutral'} pulse={c.status === 'running'} />
            <h2 className="text-xl font-semibold mt-2 break-all">{c.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="mono text-xs text-on-surface-variant">{c.id}</span>
              <CopyButton value={c.id} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {agent && (
              <>
                <Link
                  to={`/container-metrics?id=${encodeURIComponent(c.id)}`}
                  className="px-3 py-2 rounded-lg bg-primary-container text-white text-sm hover:opacity-90"
                >
                  {t('containers.metrics.viewFull')}
                </Link>
                {agentDashboardUrl(c) && (
                  <a
                    href={agentDashboardUrl(c)!}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-high"
                  >
                    {t('containers.detail.openAgentDashboard')}
                  </a>
                )}
              </>
            )}
          </div>
        </div>
        <PillTabs
          tabs={[
            { id: 'overview' as Tab, label: t('containers.detail.overview') },
            { id: 'processes' as Tab, label: t('section.processes') },
            { id: 'services' as Tab, label: t('section.services') },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'overview' && <ContainerOverview c={c} agentMetrics={agentMetrics} />}
        {tab !== 'overview' && agent && metricsCtx ? (
          <MetricsContext.Provider value={metricsCtx}>
            {tab === 'processes' ? <ProcessesPage /> : <ServicesPage />}
          </MetricsContext.Provider>
        ) : tab !== 'overview' ? (
          <EmptyState message={t('containers.tabs.noAgentMetrics')} />
        ) : null}
      </div>
    </div>
  )
}

export function ContainersPage() {
  const { t } = useTranslation()
  const { snapshot } = useMetricsContext()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const containers = snapshot?.payload.containers ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return containers
    return containers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.image.toLowerCase().includes(q),
    )
  }, [containers, search])

  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null

  if (!snapshot) return <EmptyState message={t('app.waiting')} />

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <h1 className="text-2xl font-semibold">{t('containers.pageTitle')}</h1>
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,55%)_minmax(0,45%)] gap-4 flex-1 min-h-0">
        <div className="panel flex flex-col min-h-[280px] lg:min-h-0 overflow-hidden">
          <div className="p-4 border-b border-outline-variant space-y-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('containers.search')}
              className="w-full px-3 py-2 rounded-lg bg-surface-high border border-outline-variant text-sm"
            />
            <div className="text-xs text-on-surface-variant">
              {t('containers.total', { count: filtered.length })}
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <EmptyState message={t('containers.noMatch')} />
            ) : (
              filtered.map((c) => (
                <ContainerRow
                  key={c.id}
                  c={c}
                  selected={selected?.id === c.id}
                  onSelect={() => setSelectedId(c.id)}
                />
              ))
            )}
          </div>
        </div>
        <div className="min-h-[320px] lg:min-h-0 overflow-hidden">
          {selected ? (
            <ContainerDetail c={selected} />
          ) : (
            <EmptyState message={t('containers.detail.pick')} />
          )}
        </div>
      </div>
    </div>
  )
}
