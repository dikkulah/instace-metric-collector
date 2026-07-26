import { useTranslation } from 'react-i18next'
import { useHistorySamples } from '../../api/useHistorySamples'
import { useHistoryView } from '../../context/HistoryViewContext'
import { MetricTrendChart } from '../../components/MetricTrendChart'
import { TimeRangePicker } from '../../components/TimeRangePicker'
import { PageShell } from '../../components/layout/PageShell'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBanner } from '../../components/ErrorBanner'
import {
  containerSeries,
  cpuSeries,
  diskSeries,
  memorySeries,
} from '../../lib/historySeries'
import { formatPercent } from '../../lib/format'

export function DashboardHistoryView() {
  const { t } = useTranslation()
  const { timeRange, setTimeRange } = useHistoryView()
  const { samples, loading, error } = useHistorySamples(timeRange, true)

  const cpu = cpuSeries(samples)
  const memory = memorySeries(samples)
  const disk = diskSeries(samples)
  const containers = containerSeries(samples)

  return (
    <PageShell title={t('nav.dashboard')} variant="scroll">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
        <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        <span className="text-xs text-on-surface-variant">
          {t('history.sampleCount', { count: samples.length })}
        </span>
      </div>

      {error && <ErrorBanner message={t('history.error')} />}
      {loading && samples.length === 0 && <EmptyState message={t('history.loading')} />}
      {!loading && samples.length === 0 && !error && <EmptyState message={t('history.empty')} />}

      {samples.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MetricTrendChart
            label={t('card.cpu')}
            points={cpu}
            formatValue={(v) => formatPercent(v)}
          />
          <MetricTrendChart
            label={t('card.memory')}
            points={memory}
            formatValue={(v) => formatPercent(v)}
          />
          {disk.length > 0 && (
            <MetricTrendChart
              label={t('section.disk')}
              points={disk}
              formatValue={(v) => formatPercent(v)}
            />
          )}
          {containers.some((p) => p.value > 0) && (
            <MetricTrendChart
              label={t('card.containers')}
              points={containers}
              max={Math.max(...containers.map((p) => p.value), 1)}
              formatValue={(v) => String(Math.round(v))}
              color="var(--color-tertiary)"
            />
          )}
        </div>
      )}
    </PageShell>
  )
}
