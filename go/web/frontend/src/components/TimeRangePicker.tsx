import { useTranslation } from 'react-i18next'
import { SegmentedControl } from './PillTabs'
import type { HistoryTimeRange } from '../context/HistoryViewContext'

const RANGES: HistoryTimeRange[] = ['1h', '6h', '24h', '7d']

export function TimeRangePicker({
  value,
  onChange,
}: {
  value: HistoryTimeRange
  onChange: (range: HistoryTimeRange) => void
}) {
  const { t } = useTranslation()

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={RANGES.map((id) => ({
        id,
        label: t(`history.range.${id}`),
      }))}
    />
  )
}
