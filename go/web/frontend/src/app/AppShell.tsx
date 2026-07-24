import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AppMode } from '../api/types'
import { LiveIndicator } from '../components/LiveIndicator'
import { SearchInput } from '../components/SearchInput'
import { useState } from 'react'

const agentNav = [
  { to: '/', labelKey: 'nav.dashboard', end: true },
  { to: '/processes', labelKey: 'nav.processes', end: false },
  { to: '/services', labelKey: 'nav.services', end: false },
  { to: '/containers', labelKey: 'nav.containers', end: false },
]

const hubNav = [{ to: '/hub', labelKey: 'nav.hub', end: true }]

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
  const nav = mode === 'hub' ? hubNav : agentNav
  const [globalSearch, setGlobalSearch] = useState('')

  const switchLocale = (lng: 'en' | 'tr') => {
    void i18n.changeLanguage(lng)
    localStorage.setItem('imc.locale', lng)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="w-full lg:w-60 border-b lg:border-b-0 lg:border-r border-outline-variant bg-surface p-4 lg:min-h-screen shrink-0">
        <div className="font-semibold text-lg mb-6">{t('app.title')}</div>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto" aria-label="Main">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm whitespace-nowrap ${
                  isActive
                    ? 'bg-primary-container/30 text-primary border-l-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-high'
                }`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        {version && (
          <div className="mt-6 hidden lg:block text-xs text-on-surface-variant mono">{version}</div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-outline-variant px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] max-w-xl">
            <SearchInput
              value={globalSearch}
              onChange={setGlobalSearch}
              placeholder={t('app.search')}
              shortcut="⌘K"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
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
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet context={{ globalSearch }} />
        </main>
      </div>
    </div>
  )
}
