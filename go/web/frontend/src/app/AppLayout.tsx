import { useTranslation } from 'react-i18next'
import { AppShell } from './AppShell'
import { useMeta } from '../api/useMeta'
import { useMetrics } from '../api/useMetrics'
import { EmptyState } from '../components/EmptyState'
import { HistoryViewProvider } from '../context/HistoryViewContext'

export function AppLayout() {
  const { t } = useTranslation()
  const { meta, loading, error } = useMeta()
  const { live, lastUpdate } = useMetrics()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState message={t('app.loading')} />
      </div>
    )
  }

  if (error || !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <EmptyState message={error ?? t('app.apiUnavailable')} />
      </div>
    )
  }

  return (
    <HistoryViewProvider>
      <AppShell
        mode={meta.mode}
        live={meta.mode === 'hub' ? true : live}
        lastUpdate={meta.mode === 'hub' ? null : lastUpdate}
        version={meta.version}
      />
    </HistoryViewProvider>
  )
}
