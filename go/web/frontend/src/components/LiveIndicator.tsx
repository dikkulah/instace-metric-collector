import { useTranslation } from 'react-i18next'
import { formatTime } from '../lib/format'

export function LiveIndicator({ live, lastUpdate }: { live: boolean; lastUpdate: Date | null }) {
  const { t, i18n } = useTranslation()
  return (
    <div className="flex items-center gap-4 text-sm text-on-surface-variant" data-testid="live-indicator">
      <span className="inline-flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${live ? 'bg-tertiary animate-pulse' : 'bg-outline'}`} />
        {live ? t('app.live') : t('app.offline')}
      </span>
      <span>{t('app.lastUpdate')}: {formatTime(lastUpdate, i18n.language)}</span>
    </div>
  )
}
