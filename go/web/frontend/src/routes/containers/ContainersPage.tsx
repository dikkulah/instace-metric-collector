import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { useContainerMetrics } from '../../api/useContainerMetrics'
import { useAgentHref, useIsHubAgentContext } from '../../hooks/useAgentBasePath'
import { EmptyState } from '../../components/EmptyState'
import { PillTabs } from '../../components/PillTabs'
import { StatusPill } from '../../components/StatusPill'
import { CopyButton } from '../../components/CopyButton'
import { DefinitionList } from '../../components/DefinitionList'
import { MetricCard } from '../../components/MetricCard'
import { SearchInput } from '../../components/SearchInput'
import { MetricsContext } from '../../context/MetricsContext'
import { PageShell } from '../../components/layout/PageShell'
import { MasterDetailLayout } from '../../components/layout/MasterDetailLayout'
import { ScrollPane } from '../../components/layout/ScrollPane'
import type { ContainerInfo } from '../../api/types'
import { formatBytes, formatPercent, isAgentContainer } from '../../lib/format'
import { ProcessesPage } from '../processes/ProcessesPage'
import { ServicesPage } from '../services/ServicesPage'

type Tab = 'overview' | 'processes' | 'services'

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
      className={`w-full text-left p-4 border-b border-outline-variant/40 hover:bg-surface-high border-l-2 ${
        selected ? 'bg-primary-container/15 border-l-primary' : 'border-l-transparent'
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
  onSelectPeer,
  metricsPath,
}: {
  c: ContainerInfo
  agentMetrics: ReturnType<typeof useContainerMetrics>
  onSelectPeer: (id: string) => void
  metricsPath: string
}) {
  const { t } = useTranslation()
  const { snapshot: hostSnap } = useMetricsContext()
  const peers = (hostSnap?.payload.containers ?? []).filter(
    (x) => x.composeProject && x.composeProject === c.composeProject && x.id !== c.id,
  )
  const agent = isAgentContainer(c)
  const m = agentMetrics.snapshot?.payload

  return (
    <div className="space-y-4">
      <DefinitionList
        items={[
          {
            label: t('container.id'),
            value: <span className="flex items-center gap-2">{c.id.slice(0, 12)}… <CopyButton value={c.id} /></span>,
          },
          { label: t('container.image'), value: c.image },
          { label: t('table.status'), value: c.status },
          { label: t('container.health'), value: c.health || '—' },
          { label: t('table.restarts'), value: String(c.restartCount) },
          { label: t('container.composeProject'), value: `${c.composeProject || '—'} / ${c.composeService || '—'}` },
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
                    <button
                      type="button"
                      onClick={() => onSelectPeer(p.id)}
                      className="text-primary text-xs hover:underline"
                    >
                      {t('containers.detail.viewFull')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {agent && (
        <Link to={metricsPath} className="inline-block text-sm text-primary hover:underline">
          {t('containers.detail.openAgentDashboard')}
        </Link>
      )}
    </div>
  )
}

function ContainerDetail({
  c,
  onBack,
  onSelectPeer,
}: {
  c: ContainerInfo
  onBack?: () => void
  onSelectPeer: (id: string) => void
}) {
  const { t } = useTranslation()
  const agent = isAgentContainer(c)
  const hubContext = useIsHubAgentContext()
  const metricsPath = useAgentHref('container-metrics', { id: c.id })
  const [tab, setTab] = useState<Tab>('overview')
  const agentMetrics = useContainerMetrics(agent && !hubContext ? c.id : null)
  const metricsCtx = agentMetrics.snapshot
    ? { snapshot: agentMetrics.snapshot, live: !agentMetrics.unavailable, lastUpdate: new Date(agentMetrics.snapshot.collectedAt) }
    : null

  return (
    <div className="panel flex flex-col h-full min-h-0 overflow-hidden">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="lg:hidden text-sm text-primary hover:underline shrink-0 text-left px-4 pt-4"
        >
          {t('containers.mobile.back')}
        </button>
      )}
      <div className="p-4 space-y-2 shrink-0 border-b border-outline-variant">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <StatusPill label={c.health || c.status} tone={c.health === 'healthy' ? 'success' : 'neutral'} pulse={c.status === 'running'} />
            <h2 className="text-lg font-semibold mt-2 break-all">{c.name}</h2>
            <div className="flex items-center gap-2 mt-1 min-w-0">
              <span className="mono text-xs text-on-surface-variant truncate">{c.id}</span>
              <CopyButton value={c.id} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {agent && !hubContext && (
              <Link
                to={metricsPath}
                className="px-3 py-2 rounded-lg bg-primary-container text-white text-sm hover:opacity-90"
              >
                {t('containers.detail.openAgentDashboard')}
              </Link>
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
      <ScrollPane className="p-4">
        {tab === 'overview' && (
          <ContainerOverview c={c} agentMetrics={agentMetrics} onSelectPeer={onSelectPeer} metricsPath={metricsPath} />
        )}
        {tab !== 'overview' && agent && metricsCtx ? (
          <MetricsContext.Provider value={metricsCtx}>
            {tab === 'processes' ? <ProcessesPage surface="containerDetail" /> : <ServicesPage surface="containerDetail" />}
          </MetricsContext.Provider>
        ) : tab !== 'overview' ? (
          <EmptyState message={t('containers.tabs.noAgentMetrics')} />
        ) : null}
      </ScrollPane>
    </div>
  )
}

export function ContainersPage() {
  const { t } = useTranslation()
  const { snapshot } = useMetricsContext()
  const [searchParams] = useSearchParams()
  const initialId = searchParams.get('id')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(initialId)
  const [mobileDetail, setMobileDetail] = useState(!!initialId)

  const containers = snapshot?.payload.containers ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return containers
    return containers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.image.toLowerCase().includes(q),
    )
  }, [containers, search])

  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null

  const selectContainer = (id: string) => {
    setSelectedId(id)
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) {
      setMobileDetail(true)
    }
  }

  if (!snapshot) return <EmptyState message={t('app.waiting')} />

  const master = (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="p-4 border-b border-outline-variant space-y-2 shrink-0">
        <SearchInput value={search} onChange={setSearch} placeholder={t('containers.search')} />
        <div className="text-xs text-on-surface-variant">
          {t('containers.total', { count: filtered.length })}
        </div>
      </div>
      <ScrollPane>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center min-h-[12rem] p-8 text-sm text-on-surface-variant text-center">
            {t('containers.noMatch')}
          </div>
        ) : (
          filtered.map((c) => (
            <ContainerRow
              key={c.id}
              c={c}
              selected={selected?.id === c.id}
              onSelect={() => selectContainer(c.id)}
            />
          ))
        )}
      </ScrollPane>
    </div>
  )

  const detail = selected ? (
    <ContainerDetail
      c={selected}
      onBack={mobileDetail ? () => setMobileDetail(false) : undefined}
      onSelectPeer={(id) => {
        selectContainer(id)
      }}
    />
  ) : (
    <div className="panel h-full flex items-center justify-center p-8 text-center text-on-surface-variant text-sm">
      {t('containers.detail.pick')}
    </div>
  )

  return (
    <PageShell title={t('containers.pageTitle')} variant="workbench">
      <div className="h-full min-h-0 lg:hidden">
        {mobileDetail && selected ? (
          <div className="h-full min-h-0 overflow-hidden">{detail}</div>
        ) : (
          <div className="panel overflow-hidden flex flex-col h-full min-h-0">{master}</div>
        )}
      </div>
      <div className="hidden lg:block h-full min-h-0">
        <MasterDetailLayout surface="page" masterRatio="55/45" master={master} detail={detail} />
      </div>
    </PageShell>
  )
}
