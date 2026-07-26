import { useTranslation } from 'react-i18next'
import { useHistorySamples } from '../../api/useHistorySamples'
import { useHistoryView } from '../../context/HistoryViewContext'
import { MetricTrendChart } from '../../components/MetricTrendChart'
import { TimeRangePicker } from '../../components/TimeRangePicker'
import { PageShell } from '../../components/layout/PageShell'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBanner } from '../../components/ErrorBanner'
import {
  HISTORY_SAMPLE_LIMIT_MAX,
  HISTORY_SAMPLE_LIMIT_MIN,
} from '../../lib/historyPreferences'
import {
  containerSeries,
  cpuSeries,
  diskSeries,
  memorySeries,
  sampleTimeSpan,
} from '../../lib/historySeries'
import { formatPercent } from '../../lib/format'
import { HistoryDataSpan } from '../../components/HistoryDataSpan'

export function DashboardHistoryView() {
  const { t } = useTranslation()
  const { timeRange, setTimeRange, sampleLimit, setSampleLimit } = useHistoryView()
  const { samples, loading, error } = useHistorySamples(timeRange, true, sampleLimit)
  const limitReached = samples.length >= sampleLimit && samples.length > 0

  const cpu = cpuSeries(samples)
  const memory = memorySeries(samples)
  const disk = diskSeries(samples)
  const containers = containerSeries(samples)
  const span = sampleTimeSpan(samples)

  return (
    <PageShell title={t('nav.dashboard')} variant="scroll">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-2">
        <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        <label className="flex flex-col gap-1 text-xs min-w-[7rem]">
          <span className="label-caps text-on-surface-variant">{t('history.sampleLimit')}</span>
          <input
            type="number"
            min={HISTORY_SAMPLE_LIMIT_MIN}
            max={HISTORY_SAMPLE_LIMIT_MAX}
            step={50}
            value={sampleLimit}
            onChange={(e) => setSampleLimit(Number(e.target.value))}
            className="rounded-md border border-outline-variant bg-surface-high px-2 py-1.5 text-sm mono w-full"
          />
        </label>
        <span className="text-xs text-on-surface-variant pb-1.5">
          {t('history.sampleCount', { count: samples.length })}
          {limitReached && (
            <span className="text-amber-400/90"> · {t('history.limitReached', { limit: sampleLimit })}</span>
          )}
        </span>
      </div>

      {samples.length > 0 && span.from && span.to && (
        <div className="mb-3">
          <HistoryDataSpan timeRange={timeRange} spanFrom={span.from} spanTo={span.to} />
        </div>
      )}

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
