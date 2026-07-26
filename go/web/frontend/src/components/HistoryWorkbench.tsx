import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MetricsContext } from '../context/MetricsContext'
import { useHistoryView } from '../context/HistoryViewContext'
import { useSelectedHistorySnapshot } from '../hooks/useSelectedHistorySnapshot'
import { sampleTimeSpan } from '../lib/historySeries'
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
  const { viewMode, sampleLimit, setSampleLimit } = useHistoryView()
  const history = useSelectedHistorySnapshot(viewMode === 'history')
  const span = sampleTimeSpan(history.samples)

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
        samples={history.samples}
        buckets={history.buckets}
        bucketIndex={history.bucketIndex}
        onBucketIndexChange={history.setBucketIndex}
        sampleLimit={sampleLimit}
        onSampleLimitChange={setSampleLimit}
        collectedAt={history.snapshot?.collectedAt}
        spanFrom={span.from}
        spanTo={span.to}
      />
      {history.error && <ErrorBanner message={t('history.error')} />}
      {history.loading && !history.snapshot && <EmptyState message={t('history.loading')} />}
      {!history.loading && !history.snapshot && !history.error && (
        <EmptyState message={t('history.emptyHint')} />
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
