import { useTranslation } from 'react-i18next'
import { useHubConfig } from '../api/useHubConfig'
import { useHubStats } from '../api/useHubStats'
import { formatHistoryTime } from '../lib/historySeries'

export function HubOpsPanel() {
  const { t } = useTranslation()
  const stats = useHubStats()
  const config = useHubConfig()

  return (
    <section className="panel p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold">{t('hub.ops.title')}</h2>
        <p className="text-xs text-on-surface-variant mt-1">{t('hub.ops.subtitle')}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
        <div className="rounded-md border border-outline-variant/60 p-3">
          <div className="label-caps text-xs">{t('hub.ops.agents')}</div>
          <div className="mono text-lg mt-1">{stats.agentCount}</div>
        </div>
        <div className="rounded-md border border-outline-variant/60 p-3">
          <div className="label-caps text-xs">{t('hub.ops.ingestOk')}</div>
          <div className="mono text-lg mt-1">{stats.ingestTotal}</div>
        </div>
        <div className="rounded-md border border-outline-variant/60 p-3">
          <div className="label-caps text-xs">{t('hub.ops.ingestErrors')}</div>
          <div className="mono text-lg mt-1">{stats.ingestErrors}</div>
        </div>
        <div className="rounded-md border border-outline-variant/60 p-3">
          <div className="label-caps text-xs">{t('hub.ops.alertsSent')}</div>
          <div className="mono text-lg mt-1">{stats.alertDispatched}</div>
        </div>
        <div className="rounded-md border border-outline-variant/60 p-3">
          <div className="label-caps text-xs">{t('hub.ops.alertsFailed')}</div>
          <div className="mono text-lg mt-1">{stats.alertFailed}</div>
        </div>
        <div className="rounded-md border border-outline-variant/60 p-3">
          <div className="label-caps text-xs">{t('hub.ops.alertQueue')}</div>
          <div className="mono text-lg mt-1">{stats.alertQueueDepth}</div>
        </div>
      </div>
      {config.history?.enabled && (
        <div className="text-xs text-on-surface-variant border-t border-outline-variant/50 pt-3 space-y-1">
          <div className="font-medium text-on-surface">{t('hub.ops.historyTitle')}</div>
          <div>
            {t('hub.ops.historyProfile')}: <span className="mono">{config.history.profile}</span>
          </div>
          <div>
            {t('hub.ops.historyRetention')}:{' '}
            <span className="mono">{t('hub.ops.historyRetentionDays', { count: config.history.retentionDays })}</span>
          </div>
          {config.history.dbPath && (
            <div className="break-all">
              {t('hub.ops.historyDb')}: <span className="mono">{config.history.dbPath}</span>
            </div>
          )}
          {config.history.stats && config.history.stats.rawSampleCount > 0 && (
            <>
              <div>
                {t('hub.ops.historySamples')}:{' '}
                <span className="mono">{config.history.stats.rawSampleCount.toLocaleString()}</span>
                {config.history.stats.hourlyRows > 0 && (
                  <span className="text-on-surface-variant">
                    {' '}
                    · {t('hub.ops.historyHourlyRows', { count: config.history.stats.hourlyRows })}
                  </span>
                )}
              </div>
              {config.history.stats.oldestSample && config.history.stats.newestSample && (
                <div>
                  {t('hub.ops.historyDataSpan', {
                    from: formatHistoryTime(config.history.stats.oldestSample),
                    to: formatHistoryTime(config.history.stats.newestSample),
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
