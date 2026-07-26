import type { HistoryTimeRange } from '../context/HistoryViewContext'
import { historyRangeBounds } from './historySeries'

const RANGE_MS: Record<HistoryTimeRange, number> = {
  '1h': 3_600_000,
  '6h': 6 * 3_600_000,
  '24h': 24 * 3_600_000,
  '7d': 7 * 24 * 3_600_000,
}

/** True when stored samples cover much less than the selected UI range. */
export function isHistoryRangePartial(
  range: HistoryTimeRange,
  spanFrom?: string,
  spanTo?: string,
): boolean {
  if (!spanFrom || !spanTo) return false
  const dataStart = new Date(spanFrom).getTime()
  const dataEnd = new Date(spanTo).getTime()
  if (Number.isNaN(dataStart) || Number.isNaN(dataEnd)) return false

  const { from } = historyRangeBounds(range)
  const rangeStart = from.getTime()
  const dataSpan = Math.max(dataEnd - dataStart, 0)
  const selectedSpan = RANGE_MS[range]

  if (dataStart - rangeStart > 15 * 60_000) return true
  return dataSpan < selectedSpan * 0.2
}
