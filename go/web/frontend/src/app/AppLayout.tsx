import { AppShell } from './AppShell'
import { useMeta } from '../api/useMeta'
import { useMetrics } from '../api/useMetrics'
import { EmptyState } from '../components/EmptyState'

export function AppLayout() {
  const { meta, loading, error } = useMeta()
  const { live, lastUpdate } = useMetrics()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState message="Loading…" />
      </div>
    )
  }

  if (error || !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <EmptyState message={error ?? 'API unavailable'} />
      </div>
    )
  }

  return (
    <AppShell
      mode={meta.mode}
      live={live}
      lastUpdate={lastUpdate}
      version={meta.version}
    />
  )
}
