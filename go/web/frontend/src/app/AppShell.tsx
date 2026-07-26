import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AppMode } from '../api/types'
import { LiveIndicator } from '../components/LiveIndicator'
import { LiveHistoryToggle } from '../components/LiveHistoryToggle'
import { SearchInput } from '../components/SearchInput'
import { HubSidebarNav } from '../components/HubSidebarNav'
import { useState } from 'react'

function isDashboardRoute(pathname: string): boolean {
  if (pathname === '/') return true
  return /^\/hub\/agents\/[^/]+$/.test(pathname)
}

const agentNav = [
  { to: '/', labelKey: 'nav.dashboard', end: true },
  { to: '/processes', labelKey: 'nav.processes', end: false },
  { to: '/services', labelKey: 'nav.services', end: false },
  { to: '/containers', labelKey: 'nav.containers', end: false },
]

export function AppShell({
  mode,
  live,
  lastUpdate,
  version,
}: {
  mode: AppMode
  live: boolean
  lastUpdate: Date | null
  version?: string
}) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const showHistoryToggle = isDashboardRoute(location.pathname)
  const nav = agentNav
  const [globalSearch, setGlobalSearch] = useState('')

  const switchLocale = (lng: 'en' | 'tr') => {
    void i18n.changeLanguage(lng)
    localStorage.setItem('imc.locale', lng)
  }

  return (
    <div className="h-dvh flex flex-col lg:flex-row overflow-hidden">
      <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-outline-variant bg-surface p-4 shrink-0 lg:overflow-y-auto">
        <div className="font-semibold text-lg mb-6">{t('app.title')}</div>
        <nav
          className={`grid gap-1 ${
            mode === 'hub'
              ? 'grid-cols-1'
              : 'grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-col lg:overflow-x-visible'
          }`}
          aria-label="Main"
        >
          {mode === 'hub' ? (
            <HubSidebarNav />
          ) : (
            nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm whitespace-nowrap border-l-2 shrink-0 ${
                    isActive
                      ? 'bg-primary-container/30 text-primary border-primary'
                      : 'text-on-surface-variant hover:bg-surface-high border-transparent'
                  }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))
          )}
        </nav>
        {version && (
          <div className="mt-6 hidden lg:block text-xs text-on-surface-variant mono">{version}</div>
        )}
        {mode === 'agent' && (
          <div className="mt-4 p-3 rounded-md bg-surface-high text-xs text-on-surface-variant leading-relaxed">
            {t('agent.hubHint')}
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="border-b border-outline-variant px-4 md:px-6 py-3 flex flex-wrap items-center gap-3 shrink-0 min-h-[3.25rem]">
          <div className="flex-1 min-w-[200px] max-w-xl">
            <SearchInput
              value={globalSearch}
              onChange={setGlobalSearch}
              placeholder={t('app.search')}
              shortcut="⌘K"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            {showHistoryToggle && <LiveHistoryToggle />}
            <button
              type="button"
              onClick={() => switchLocale('en')}
              className={i18n.language === 'en' ? 'text-primary font-medium' : 'text-on-surface-variant'}
            >
              EN
            </button>
            <span className="text-on-surface-variant">|</span>
            <button
              type="button"
              onClick={() => switchLocale('tr')}
              className={i18n.language === 'tr' ? 'text-primary font-medium' : 'text-on-surface-variant'}
            >
              TR
            </button>
          </div>
          <LiveIndicator live={live} lastUpdate={lastUpdate} />
        </header>
        <main className="flex-1 p-4 md:p-6 min-h-0 overflow-hidden flex flex-col">
          <Outlet context={{ globalSearch }} />
        </main>
      </div>
    </div>
  )
}
