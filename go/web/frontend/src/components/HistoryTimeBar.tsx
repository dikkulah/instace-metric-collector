import { useTranslation } from 'react-i18next'
import type { HistoryTimeRange } from '../context/HistoryViewContext'
import { TimeRangePicker } from './TimeRangePicker'

export function HistoryTimeBar({
  timeRange,
  onTimeRangeChange,
  sampleIndex,
  onSampleIndexChange,
  sampleCount,
  collectedAt,
}: {
  timeRange: HistoryTimeRange
  onTimeRangeChange: (range: HistoryTimeRange) => void
  sampleIndex: number
  onSampleIndexChange: (index: number) => void
  sampleCount: number
  collectedAt?: string
}) {
  const { t } = useTranslation()
  const maxIndex = Math.max(sampleCount - 1, 0)

  return (
    <div className="panel p-3 mb-4 space-y-3 shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} />
        <span className="text-xs text-on-surface-variant">
          {t('history.sampleCount', { count: sampleCount })}
        </span>
      </div>
      {sampleCount > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
            <span>{t('history.scrubber')}</span>
            {collectedAt && <span className="mono">{collectedAt}</span>}
          </div>
          <input
            type="range"
            min={0}
            max={maxIndex}
            value={sampleIndex}
            onChange={(e) => onSampleIndexChange(Number(e.target.value))}
            className="w-full accent-primary"
            disabled={sampleCount <= 1}
          />
        </div>
      )}
    </div>
  )
}
