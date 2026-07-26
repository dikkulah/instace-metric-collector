import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MetricsContext } from '../context/MetricsContext'
import { useHistoryView } from '../context/HistoryViewContext'
import { useSelectedHistorySnapshot } from '../hooks/useSelectedHistorySnapshot'
import { EmptyState } from './EmptyState'
import { ErrorBanner } from './ErrorBanner'
import { HistoryTimeBar } from './HistoryTimeBar'
import { PageShell } from './layout/PageShell'
import type { PageVariant } from './layout/PageShell'

export function HistoryWorkbench({
  title,
  variant = 'workbench',
  children,
}: {
  title?: string
  variant?: PageVariant
  children: ReactNode
}) {
  const { t } = useTranslation()
  const { viewMode } = useHistoryView()
  const history = useSelectedHistorySnapshot(viewMode === 'history')

  if (viewMode !== 'history') {
    return (
      <PageShell title={title} variant={variant}>
        {children}
      </PageShell>
    )
  }

  return (
    <PageShell title={title} variant={variant}>
      <HistoryTimeBar
        timeRange={history.timeRange}
        onTimeRangeChange={history.setTimeRange}
        sampleIndex={history.sampleIndex}
        onSampleIndexChange={history.setSampleIndex}
        sampleCount={history.samples.length}
        collectedAt={history.snapshot?.collectedAt}
      />
      {history.error && <ErrorBanner message={t('history.error')} />}
      {history.loading && !history.snapshot && <EmptyState message={t('history.loading')} />}
      {!history.loading && !history.snapshot && !history.error && (
        <EmptyState message={t('history.empty')} />
      )}
      {history.snapshot && (
        <MetricsContext.Provider
          value={{
            snapshot: history.snapshot,
            live: false,
            lastUpdate: new Date(history.snapshot.collectedAt),
          }}
        >
          {children}
        </MetricsContext.Provider>
      )}
    </PageShell>
  )
}
