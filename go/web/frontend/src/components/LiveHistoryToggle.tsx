import { useTranslation } from 'react-i18next'
import { SegmentedControl } from './PillTabs'
import { useHistoryView } from '../context/HistoryViewContext'

export function LiveHistoryToggle() {
  const { t } = useTranslation()
  const { viewMode, setViewMode } = useHistoryView()

  return (
    <SegmentedControl
      value={viewMode}
      onChange={setViewMode}
      options={[
        { id: 'live' as const, label: t('app.live') },
        { id: 'history' as const, label: t('app.history') },
      ]}
    />
  )
}
