import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { HubAlertConfig } from '../../api/useHubAlertConfig'
import { useHubAlertConfig } from '../../api/useHubAlertConfig'

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs label-caps text-on-surface-variant">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm mono disabled:opacity-60"
      />
    </label>
  )
}

export function HubAlertSettings() {
  const { t } = useTranslation()
  const { config, loading, saving, error, saved, save } = useHubAlertConfig()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<HubAlertConfig>(config)

  const patch = (partial: Partial<HubAlertConfig>) => {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  const handleOpen = () => {
    setDraft({ ...config })
    setOpen(true)
  }

  const handleSave = async () => {
    await save(draft)
    setOpen(false)
  }

  if (loading) {
    return (
      <div className="panel p-4 text-sm text-on-surface-variant">
        {t('hub.settings.loading')}
      </div>
    )
  }

  const values = open ? draft : config

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('hub.settings.title')}</h2>
          <p className="text-sm text-on-surface-variant">{t('hub.settings.subtitle')}</p>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={handleOpen}
            className="px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-medium hover:opacity-90"
          >
            {t('hub.settings.edit')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-md border border-outline-variant text-sm"
            >
              {t('hub.settings.cancel')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? t('hub.settings.saving') : t('hub.settings.save')}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-error">
          {error === 'save' ? t('hub.settings.saveError') : t('hub.settings.loadError')}
        </div>
      )}
      {saved && !open && (
        <div className="text-sm text-tertiary">{t('hub.settings.saved')}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <NumberField
          label={t('hub.settings.cpuPercent')}
          value={values.cpuPercent}
          min={1}
          max={100}
          disabled={!open}
          onChange={(v) => patch({ cpuPercent: v })}
        />
        <NumberField
          label={t('hub.settings.memoryPercent')}
          value={values.memoryPercent}
          min={1}
          max={100}
          disabled={!open}
          onChange={(v) => patch({ memoryPercent: v })}
        />
        <NumberField
          label={t('hub.settings.diskPercent')}
          value={values.diskPercent}
          min={1}
          max={100}
          disabled={!open}
          onChange={(v) => patch({ diskPercent: v })}
        />
        <NumberField
          label={t('hub.settings.cooldownMinutes')}
          value={values.cooldownMinutes}
          min={1}
          max={1440}
          disabled={!open}
          onChange={(v) => patch({ cooldownMinutes: v })}
        />
        <NumberField
          label={t('hub.settings.staleMultiplier')}
          value={values.staleMultiplier}
          min={1}
          max={10}
          step={0.5}
          disabled={!open}
          onChange={(v) => patch({ staleMultiplier: v })}
        />
        <NumberField
          label={t('hub.settings.sustainedWindowMinutes')}
          value={values.sustainedWindowMinutes}
          min={0}
          max={1440}
          disabled={!open}
          onChange={(v) => patch({ sustainedWindowMinutes: v })}
        />
        <NumberField
          label={t('hub.settings.offlineAfterHours')}
          value={values.offlineAfterHours}
          min={1}
          max={720}
          disabled={!open}
          onChange={(v) => patch({ offlineAfterHours: v })}
        />
      </div>

      <details className="text-sm" open={open}>
        <summary className="cursor-pointer label-caps text-on-surface-variant">
          {t('hub.settings.diagnosticsTitle')}
        </summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <NumberField
            label={t('hub.settings.cpuSpikeMinPercent')}
            value={values.cpuSpikeMinPercent}
            min={1}
            max={100}
            disabled={!open}
            onChange={(v) => patch({ cpuSpikeMinPercent: v })}
          />
          <NumberField
            label={t('hub.settings.memoryPressurePercent')}
            value={values.memoryPressurePercent}
            min={1}
            max={100}
            disabled={!open}
            onChange={(v) => patch({ memoryPressurePercent: v })}
          />
          <NumberField
            label={t('hub.settings.diskFillingPercent')}
            value={values.diskFillingPercent}
            min={1}
            max={100}
            disabled={!open}
            onChange={(v) => patch({ diskFillingPercent: v })}
          />
          <NumberField
            label={t('hub.settings.containerRestartCount')}
            value={values.containerRestartCount}
            min={1}
            max={100}
            disabled={!open}
            onChange={(v) => patch({ containerRestartCount: v })}
          />
        </div>
      </details>
    </div>
  )
}
