import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHubAgents } from '../../api/useHubAgents'
import { EmptyState } from '../../components/EmptyState'
import { MetricCard } from '../../components/MetricCard'
import { SearchInput } from '../../components/SearchInput'
import { StatusPill } from '../../components/StatusPill'
import { formatBytes, formatPercent } from '../../lib/format'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.max(0, Math.floor(diff / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  return `${Math.floor(min / 60)}h ago`
}

export function HubPage() {
  const { t } = useTranslation()
  const agents = useHubAgents()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return agents
    return agents.filter(
      (a) => a.hostname.toLowerCase().includes(q) || a.agentId.toLowerCase().includes(q),
    )
  }, [agents, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t('nav.hub')}</h1>
        <div className="w-full max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder={t('hub.search')} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState message={t('app.waiting')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const memPct = a.totalMemory > 0 ? (a.usedMemory / a.totalMemory) * 100 : 0
            const staleSec = (Date.now() - new Date(a.lastSeen).getTime()) / 1000
            const stale = staleSec > 30
            return (
              <article key={a.agentId} className={`panel p-5 space-y-3 ${stale ? 'opacity-75' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{a.hostname}</div>
                  <StatusPill
                    label={stale ? 'Stale' : t('app.live')}
                    tone={stale ? 'warning' : 'success'}
                    pulse={!stale}
                  />
                </div>
                <div className="mono text-xs text-on-surface-variant">{a.agentId}</div>
                <div className="text-xs text-on-surface-variant">{relativeTime(a.lastSeen)}</div>
                <MetricCard label={t('card.cpu')} value={formatPercent(a.cpuLoad)} percent={a.cpuLoad} />
                <MetricCard
                  label={t('card.memory')}
                  value={formatPercent(memPct)}
                  percent={memPct}
                  subtitle={formatBytes(a.usedMemory)}
                />
                <div className="text-sm">
                  <span className="label-caps">{t('card.containers')}: </span>
                  <span className="mono">{a.containerCount}</span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
