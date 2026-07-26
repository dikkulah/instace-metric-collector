import { useTranslation } from 'react-i18next'
import type { HistoryTimeRange } from '../context/HistoryViewContext'
import { isHistoryRangePartial } from '../lib/historyRangeCoverage'
import { formatHistoryTime } from '../lib/historySeries'

export function HistoryDataSpan({
  timeRange,
  spanFrom,
  spanTo,
}: {
  timeRange: HistoryTimeRange
  spanFrom?: string
  spanTo?: string
}) {
  const { t } = useTranslation()
  if (!spanFrom || !spanTo) return null

  const partial = isHistoryRangePartial(timeRange, spanFrom, spanTo)

  return (
    <div className="space-y-1">
      <p className="text-xs text-on-surface-variant">
        {t('history.dataSpan', {
          from: formatHistoryTime(spanFrom),
          to: formatHistoryTime(spanTo),
        })}
      </p>
      {partial && (
        <p className="text-xs text-amber-400/90">{t('history.partialRangeHint')}</p>
      )}
    </div>
  )
}
