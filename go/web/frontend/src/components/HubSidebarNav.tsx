import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { NavLink, useLocation, useMatch } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHubAgents } from '../api/useHubAgents'

const agentViews = [
  { segment: '', labelKey: 'nav.dashboard', end: true },
  { segment: 'processes', labelKey: 'nav.processes', end: false },
  { segment: 'services', labelKey: 'nav.services', end: false },
  { segment: 'containers', labelKey: 'nav.containers', end: false },
  { segment: 'diagnostics', labelKey: 'nav.diagnostics', end: false },
  { segment: 'alerts', labelKey: 'nav.alerts', end: false },
] as const

const CHEVRON = 'w-5 shrink-0 flex items-center justify-center text-[10px] text-on-surface-variant'

function linkClass(isActive: boolean, extra = ''): string {
  return `block w-full truncate py-1.5 pl-1 pr-2 rounded-md text-sm ${extra} ${
    isActive
      ? 'bg-primary-container/30 text-primary font-medium'
      : 'text-on-surface-variant hover:bg-surface-high'
  }`
}

function TreeBranch({ children }: { children: ReactNode }) {
  return (
    <div className="ml-3 border-l border-outline-variant/30 pl-3 flex flex-col gap-0.5">{children}</div>
  )
}

function TreeLeaf({ children }: { children: ReactNode }) {
  return (
    <div className="ml-3 border-l border-outline-variant/30 pl-3 flex flex-col gap-0.5">{children}</div>
  )
}

export function HubSidebarNav() {
  const { t } = useTranslation()
  const agents = useHubAgents()
  const location = useLocation()
  const agentMatch = useMatch('/hub/agents/:agentId/*')
  const activeAgentId = agentMatch?.params.agentId

  const [hubOpen, setHubOpen] = useState(true)
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (activeAgentId) {
      setHubOpen(true)
      setExpandedAgents((prev) => ({ ...prev, [activeAgentId]: true }))
    }
  }, [activeAgentId])

  const sortedAgents = useMemo(
    () => [...agents].sort((a, b) => a.hostname.localeCompare(b.hostname)),
    [agents],
  )

  const toggleAgent = (agentId: string, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedAgents((prev) => ({ ...prev, [agentId]: !prev[agentId] }))
  }

  const hubActive =
    location.pathname === '/hub' || location.pathname.startsWith('/hub/agents')

  return (
    <nav className="flex flex-col gap-1" aria-label={t('nav.hub')}>
      <div>
        <button
          type="button"
          onClick={() => setHubOpen((v) => !v)}
          className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-left ${
            hubActive ? 'text-primary' : 'text-on-surface-variant hover:bg-surface-high'
          }`}
          aria-expanded={hubOpen}
        >
          <span className={CHEVRON}>{hubOpen ? '▾' : '▸'}</span>
          <span className="truncate">{t('nav.hub')}</span>
        </button>

        {hubOpen && (
          <TreeBranch>
            <NavLink to="/hub" end className={({ isActive }) => linkClass(isActive)}>
              {t('hub.tree.overview')}
            </NavLink>

            {sortedAgents.length === 0 ? (
              <p className="py-1.5 pr-2 text-xs text-on-surface-variant">{t('hub.noAgents')}</p>
            ) : (
              sortedAgents.map((agent) => {
                const open = expandedAgents[agent.agentId] ?? agent.agentId === activeAgentId
                const base = `/hub/agents/${encodeURIComponent(agent.agentId)}`
                const onAgent = activeAgentId === agent.agentId

                return (
                  <div key={agent.agentId}>
                    <div className="flex items-center min-w-0 gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => toggleAgent(agent.agentId, e)}
                        className={`${CHEVRON} h-8 rounded hover:text-primary`}
                        aria-label={open ? t('hub.tree.collapse') : t('hub.tree.expand')}
                      >
                        {open ? '▾' : '▸'}
                      </button>
                      <NavLink
                        to={base}
                        end
                        className={() =>
                          linkClass(false, onAgent ? 'text-on-surface' : '')
                        }
                        title={agent.agentId}
                      >
                        {agent.hostname}
                      </NavLink>
                    </div>

                    {open && (
                      <TreeLeaf>
                        {agentViews.map((view) => {
                          const to = view.segment ? `${base}/${view.segment}` : base
                          return (
                            <NavLink
                              key={view.labelKey}
                              to={to}
                              end={view.end}
                              className={({ isActive }) => linkClass(isActive)}
                            >
                              {t(view.labelKey)}
                            </NavLink>
                          )
                        })}
                      </TreeLeaf>
                    )}
                  </div>
                )
              })
            )}
          </TreeBranch>
        )}
      </div>
    </nav>
  )
}
