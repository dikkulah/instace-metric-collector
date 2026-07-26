import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHubAgents } from '../../api/useHubAgents'
import { HubAlertSettings } from './HubAlertSettings'
import { HubNotificationSettings } from '../../components/HubNotificationSettings'
import { HubOpsPanel } from '../../components/HubOpsPanel'
import { PillTabs } from '../../components/PillTabs'
import { SearchInput } from '../../components/SearchInput'
import { StatusPill } from '../../components/StatusPill'
import { PageShell } from '../../components/layout/PageShell'
import {
  agentStatusLabel,
  agentStatusTone,
  isAgentOffline,
  matchesAgentFilter,
  type AgentListFilter,
} from '../../lib/agentStatus'
import { formatBytes, formatPercent } from '../../lib/format'

function relativeTime(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.max(0, Math.floor(diff / 1000))
  if (sec < 60) return t('time.ago.seconds', { count: sec })
  const min = Math.floor(sec / 60)
  if (min < 60) return t('time.ago.minutes', { count: min })
  return t('time.ago.hours', { count: Math.floor(min / 60) })
}

function barTone(percent: number): string {
  if (percent >= 85) return 'bg-error'
  if (percent >= 60) return 'bg-amber-400'
  return 'bg-tertiary'
}

export function HubPage() {
  const { t } = useTranslation()
  const agents = useHubAgents()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<AgentListFilter>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return agents.filter((a) => {
      if (!matchesAgentFilter(a.status, filter)) return false
      if (!q) return true
      return a.hostname.toLowerCase().includes(q) || a.agentId.toLowerCase().includes(q)
    })
  }, [agents, search, filter])

  return (
    <PageShell variant="scroll">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t('nav.hub')}</h1>
        <div className="w-full max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder={t('hub.search')} />
        </div>
      </div>
      <HubAlertSettings />
      <HubNotificationSettings />
      <HubOpsPanel />
      <PillTabs
        tabs={[
          { id: 'all' as AgentListFilter, label: t('hub.filter.all') },
          { id: 'live' as AgentListFilter, label: t('hub.filter.live') },
          { id: 'offline' as AgentListFilter, label: t('hub.filter.offline') },
        ]}
        active={filter}
        onChange={setFilter}
      />
      {filtered.length === 0 ? (
        <div className="panel p-12 text-center text-on-surface-variant text-sm min-h-[16rem] flex items-center justify-center">
          {t('hub.noAgents')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const memPct = a.totalMemory > 0 ? (a.usedMemory / a.totalMemory) * 100 : 0
            const offline = isAgentOffline(a.status)
            return (
              <Link
                key={a.agentId}
                to={`/hub/agents/${encodeURIComponent(a.agentId)}`}
                className={`panel p-4 space-y-3 block hover:bg-surface-high transition-colors ${offline ? 'opacity-75' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{a.hostname}</div>
                  <StatusPill
                    label={agentStatusLabel(a.status, t)}
                    tone={agentStatusTone(a.status)}
                    pulse={a.status === 'live'}
                  />
                </div>
                <div className="mono text-xs text-on-surface-variant">{a.agentId}</div>
                <div className="text-xs text-on-surface-variant">{relativeTime(a.lastSeen, t)}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="label-caps">{t('card.cpu')}</span>
                    <span className="mono">{formatPercent(a.cpuLoad)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-highest overflow-hidden">
                    <div className={`h-full ${barTone(a.cpuLoad)}`} style={{ width: `${Math.min(a.cpuLoad, 100)}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="label-caps">{t('card.memory')}</span>
                    <span className="mono">{formatPercent(memPct)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-highest overflow-hidden">
                    <div className={`h-full ${barTone(memPct)}`} style={{ width: `${Math.min(memPct, 100)}%` }} />
                  </div>
                  <div className="text-xs text-on-surface-variant mono">
                    {formatBytes(a.usedMemory)} / {formatBytes(a.totalMemory)}
                  </div>
                </div>
                <div className="text-sm flex items-center justify-between">
                  <span className="label-caps">{t('card.containers')}</span>
                  <span className="mono px-2 py-0.5 rounded bg-surface-highest border border-outline-variant">
                    {a.containerCount}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
