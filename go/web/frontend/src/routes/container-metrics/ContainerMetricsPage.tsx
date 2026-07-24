import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { useContainerMetrics } from '../../api/useContainerMetrics'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBanner } from '../../components/ErrorBanner'
import { PillTabs } from '../../components/PillTabs'
import { StatusPill } from '../../components/StatusPill'
import { CopyButton } from '../../components/CopyButton'
import { MetricsContext } from '../../context/MetricsContext'
import { isAgentContainer } from '../../lib/format'
import { DashboardPage } from '../dashboard/DashboardPage'
import { ProcessesPage } from '../processes/ProcessesPage'
import { ServicesPage } from '../services/ServicesPage'

type Tab = 'overview' | 'processes' | 'services'

export function ContainerMetricsPage() {
  const { t } = useTranslation()
  const { snapshot: hostSnap } = useMetricsContext()
  const [params, setParams] = useSearchParams()
  const id = params.get('id') ?? ''
  const tab = (params.get('tab') as Tab) || 'overview'

  const { snapshot: containerSnap, unavailable } = useContainerMetrics(id || null)

  const hostContainer = hostSnap?.payload.containers.find(
    (c) => c.id === id || c.id.startsWith(id) || id.startsWith(c.id),
  )

  const agentContainers = (hostSnap?.payload.containers ?? []).filter(isAgentContainer)

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    setParams(p)
  }

  if (!id) return <EmptyState message={t('containers.metrics.missingId')} />
  if (!hostContainer) return <EmptyState message={t('containers.metrics.containerNotFound')} />
  if (!isAgentContainer(hostContainer)) return <EmptyState message={t('containers.metrics.notAgent')} />

  const metricsCtx = containerSnap
    ? { snapshot: containerSnap, live: !unavailable, lastUpdate: new Date(containerSnap.collectedAt) }
    : null

  return (
    <div className="space-y-4">
      <Link to="/containers" className="text-sm text-primary hover:underline">
        {t('containers.metrics.back')}
      </Link>

      <div className="panel p-5 space-y-3">
        <StatusPill label={hostContainer.health || hostContainer.status} tone="success" pulse />
        <h1 className="text-2xl font-semibold break-all">{hostContainer.name}</h1>
        <p className="text-sm text-on-surface-variant">{t('containers.metrics.agentBadge')}</p>
        <div className="flex items-center gap-2">
          <span className="mono text-xs text-on-surface-variant">{hostContainer.id}</span>
          <CopyButton value={hostContainer.id} />
        </div>
      </div>

      {unavailable && <ErrorBanner message={t('containers.metrics.unavailable')} />}

      <div>
        <div className="label-caps mb-2">{t('containers.metrics.switchContainer')}</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {agentContainers.map((c) => (
            <Link
              key={c.id}
              to={`/container-metrics?id=${encodeURIComponent(c.id)}&tab=${tab}`}
              className={`shrink-0 px-3 py-2 rounded-full border text-sm flex items-center gap-2 ${
                c.id === hostContainer.id
                  ? 'bg-primary-container text-white border-primary-container'
                  : 'border-outline-variant hover:bg-surface-high'
              }`}
            >
              {c.name}
              <span className="text-xs opacity-80">{t('containers.metrics.agentShort')}</span>
            </Link>
          ))}
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

      <div className="min-h-[50vh]">
        {metricsCtx ? (
          <MetricsContext.Provider value={metricsCtx}>
            {tab === 'overview' && <DashboardPage />}
            {tab === 'processes' && <ProcessesPage />}
            {tab === 'services' && <ServicesPage />}
          </MetricsContext.Provider>
        ) : unavailable ? null : (
          <EmptyState message={t('app.waiting')} />
        )}
      </div>
    </div>
  )
}
