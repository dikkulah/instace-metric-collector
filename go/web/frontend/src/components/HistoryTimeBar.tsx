import { useTranslation } from 'react-i18next'
import type { MetricsSnapshot } from '../api/types'
import type { HistoryTimeRange } from '../context/HistoryViewContext'
import type { HistoryBucket } from '../lib/historyBuckets'
import { historyBucketMode } from '../lib/historyBuckets'
import {
  HISTORY_SAMPLE_LIMIT_MAX,
  HISTORY_SAMPLE_LIMIT_MIN,
} from '../lib/historyPreferences'
import { formatHistoryTime } from '../lib/historySeries'
import { TimeRangePicker } from './TimeRangePicker'
import { HistoryDataSpan } from './HistoryDataSpan'

export function HistoryTimeBar({
  timeRange,
  onTimeRangeChange,
  samples,
  buckets,
  bucketIndex,
  onBucketIndexChange,
  sampleLimit,
  onSampleLimitChange,
  collectedAt,
  spanFrom,
  spanTo,
}: {
  timeRange: HistoryTimeRange
  onTimeRangeChange: (range: HistoryTimeRange) => void
  samples: MetricsSnapshot[]
  buckets: HistoryBucket[]
  bucketIndex: number
  onBucketIndexChange: (index: number) => void
  sampleLimit: number
  onSampleLimitChange: (limit: number) => void
  collectedAt?: string
  spanFrom?: string
  spanTo?: string
}) {
  const { t } = useTranslation()
  const sampleCount = samples.length
  const limitReached = sampleCount >= sampleLimit && sampleCount > 0
  const bucketMode = historyBucketMode(timeRange, samples)
  const showTimeline = bucketMode !== 'none' && buckets.length > 0
  const selectedBucket = buckets[bucketIndex]

  return (
    <div className="panel p-3 mb-4 space-y-3 shrink-0">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} />
        <label className="flex flex-col gap-1 text-xs min-w-[7rem]">
          <span className="label-caps text-on-surface-variant">{t('history.sampleLimit')}</span>
          <input
            type="number"
            min={HISTORY_SAMPLE_LIMIT_MIN}
            max={HISTORY_SAMPLE_LIMIT_MAX}
            step={50}
            value={sampleLimit}
            onChange={(e) => onSampleLimitChange(Number(e.target.value))}
            className="rounded-md border border-outline-variant bg-surface-high px-2 py-1.5 text-sm mono w-full"
          />
        </label>
        <span className="text-xs text-on-surface-variant pb-1.5">
          {t('history.sampleCount', { count: sampleCount })}
          {limitReached && (
            <span className="text-amber-400/90"> · {t('history.limitReached', { limit: sampleLimit })}</span>
          )}
        </span>
      </div>

      {sampleCount > 0 && spanFrom && spanTo && (
        <HistoryDataSpan timeRange={timeRange} spanFrom={spanFrom} spanTo={spanTo} />
      )}

      {showTimeline && collectedAt && (
        <div className="space-y-2 border-t border-outline-variant/40 pt-3">
          <div>
            <div className="label-caps text-[10px] text-on-surface-variant">
              {bucketMode === 'day' ? t('history.selectedDay') : t('history.selectedHour')}
            </div>
            <div className="text-sm font-medium mt-0.5">
              {selectedBucket?.label ?? '—'}
              <span className="text-on-surface-variant font-normal text-xs ml-2">
                ({formatHistoryTime(collectedAt)})
              </span>
            </div>
          </div>

          <div
            className="flex gap-1 overflow-x-auto pb-1"
            role="tablist"
            aria-label={bucketMode === 'day' ? t('history.dayBuckets') : t('history.hourBuckets')}
          >
            {buckets.map((bucket, i) => {
              const selected = i === bucketIndex
              return (
                <button
                  key={bucket.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onBucketIndexChange(i)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-primary-container text-white border-primary'
                      : 'border-outline-variant text-on-surface hover:bg-surface-high'
                  }`}
                  title={formatHistoryTime(samples[bucket.sampleIndex]!.collectedAt)}
                >
                  {bucket.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
