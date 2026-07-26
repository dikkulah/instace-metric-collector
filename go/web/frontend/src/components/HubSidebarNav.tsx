import { useMemo, type ReactNode } from 'react'
import { NavLink, useMatch } from 'react-router-dom'
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
  const agentMatch = useMatch('/hub/agents/:agentId/*')
  const activeAgentId = agentMatch?.params.agentId

  const sortedAgents = useMemo(
    () => [...agents].sort((a, b) => a.hostname.localeCompare(b.hostname)),
    [agents],
  )

  return (
    <nav className="flex flex-col gap-1" aria-label={t('nav.hub')}>
      <NavLink
        to="/hub"
        end
        className={({ isActive }) =>
          `block px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-primary' : 'text-on-surface-variant hover:bg-surface-high'}`
        }
      >
        {t('nav.hub')}
      </NavLink>

      <TreeBranch>
        <NavLink to="/hub" end className={({ isActive }) => linkClass(isActive)}>
          {t('hub.tree.overview')}
        </NavLink>

        {sortedAgents.length === 0 ? (
          <p className="py-1.5 pr-2 text-xs text-on-surface-variant">{t('hub.noAgents')}</p>
        ) : (
          sortedAgents.map((agent) => {
            const base = `/hub/agents/${encodeURIComponent(agent.agentId)}`
            const isActiveAgent = activeAgentId === agent.agentId

            return (
              <div key={agent.agentId}>
                <NavLink
                  to={base}
                  end
                  className={({ isActive }) =>
                    linkClass(isActive || isActiveAgent, isActiveAgent ? 'text-on-surface' : '')
                  }
                  title={agent.agentId}
                >
                  {agent.hostname}
                </NavLink>

                {isActiveAgent && (
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
    </nav>
  )
}
