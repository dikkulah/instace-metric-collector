import { useTranslation } from 'react-i18next'
import { useHubProbeConfig } from '../api/useHubProbeConfig'

export function HubProbeSettings() {
  const { t } = useTranslation()
  const {
    config,
    targetsText,
    setTargetsText,
    timeoutMs,
    setTimeoutMs,
    loading,
    saving,
    error,
    save,
  } = useHubProbeConfig()

  if (loading) {
    return (
      <section className="panel p-4 text-sm text-on-surface-variant">{t('hub.probes.loading')}</section>
    )
  }

  const locked = config?.envLocked ?? false

  return (
    <section className="panel p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold">{t('hub.probes.title')}</h2>
        <p className="text-xs text-on-surface-variant mt-1">{t('hub.probes.subtitle')}</p>
      </div>
      {locked && (
        <p className="text-xs text-amber-400/90 border border-amber-400/30 rounded-md px-3 py-2">
          {t('hub.probes.envLocked')}
        </p>
      )}
      <label className="block text-sm space-y-1">
        <span className="label-caps text-xs">{t('hub.probes.targets')}</span>
        <textarea
          value={targetsText}
          onChange={(e) => setTargetsText(e.target.value)}
          disabled={locked}
          rows={4}
          className="w-full rounded-md border border-outline-variant bg-surface-high px-3 py-2 text-sm mono disabled:opacity-60"
          placeholder={t('hub.probes.targetsPlaceholder')}
        />
      </label>
      <label className="block text-sm space-y-1 max-w-xs">
        <span className="label-caps text-xs">{t('hub.probes.timeoutMs')}</span>
        <input
          type="number"
          min={500}
          step={500}
          value={timeoutMs}
          onChange={(e) => setTimeoutMs(Number(e.target.value))}
          disabled={locked}
          className="w-full rounded-md border border-outline-variant bg-surface-high px-3 py-2 text-sm mono disabled:opacity-60"
        />
      </label>
      <p className="text-xs text-on-surface-variant">{t('hub.probes.agentNote')}</p>
      {error && <p className="text-xs text-error">{t(`hub.probes.${error}Error`)}</p>}
      {!locked && (
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t('hub.probes.saving') : t('hub.probes.save')}
        </button>
      )}
    </section>
  )
}
