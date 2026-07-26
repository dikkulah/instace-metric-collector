import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHubNotificationConfig } from '../api/useHubNotificationConfig'
import { StatusPill } from './StatusPill'

function channelTone(enabled: boolean): 'success' | 'neutral' {
  return enabled ? 'success' : 'neutral'
}

export function HubNotificationSettings() {
  const { t } = useTranslation()
  const { config, loading, saving, error, saved, save } = useHubNotificationConfig()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(config.smtp)

  type SmtpDraft = typeof config.smtp
  const [toText, setToText] = useState('')

  const handleOpen = () => {
    setDraft({ ...config.smtp })
    setToText((config.smtp.smtpTo ?? []).join(', '))
    setOpen(true)
  }

  const handleSave = async () => {
    const smtpTo = toText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    await save({ ...draft, smtpTo })
    setOpen(false)
  }

  if (loading) {
    return (
      <div className="panel p-4 text-sm text-on-surface-variant">{t('hub.notifications.loading')}</div>
    )
  }

  const channels = ['webhook', 'slack', 'discord', 'email'] as const
  const values = open ? draft : config.smtp
  const smtpEditable = open && !config.smtpLocked

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('hub.notifications.title')}</h2>
          <p className="text-sm text-on-surface-variant">{t('hub.notifications.subtitle')}</p>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={handleOpen}
            disabled={config.smtpLocked}
            className="px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {config.smtpLocked ? t('hub.notifications.envLocked') : t('hub.settings.edit')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-md border border-outline-variant text-sm">
              {t('hub.settings.cancel')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? t('hub.settings.saving') : t('hub.settings.save')}
            </button>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-error">{t('hub.notifications.saveError')}</div>}
      {saved && !open && <div className="text-sm text-tertiary">{t('hub.settings.saved')}</div>}

      <div className="flex flex-wrap gap-2">
        {channels.map((ch) => {
          const st = config.channels[ch]
          const label = t(`hub.notifications.channel.${ch}`)
          const source = st?.source === 'env' ? t('hub.notifications.sourceEnv') : st?.source === 'hub' ? t('hub.notifications.sourceHub') : ''
          return (
            <StatusPill
              key={ch}
              label={source ? `${label} (${source})` : label}
              tone={channelTone(st?.enabled ?? false)}
            />
          )
        })}
      </div>

      <p className="text-xs text-on-surface-variant">{t('hub.notifications.secretsHint')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-xs label-caps text-on-surface-variant">{t('hub.notifications.smtpHost')}</span>
          <input
            type="text"
            value={values.smtpHost}
            disabled={!smtpEditable}
            onChange={(e) => setDraft((d: SmtpDraft) => ({ ...d, smtpHost: e.target.value }))}
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm disabled:opacity-60"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs label-caps text-on-surface-variant">{t('hub.notifications.smtpPort')}</span>
          <input
            type="number"
            min={1}
            max={65535}
            value={values.smtpPort}
            disabled={!smtpEditable}
            onChange={(e) => setDraft((d: SmtpDraft) => ({ ...d, smtpPort: Number(e.target.value) }))}
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm mono disabled:opacity-60"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs label-caps text-on-surface-variant">{t('hub.notifications.smtpFrom')}</span>
          <input
            type="email"
            value={values.smtpFrom}
            disabled={!smtpEditable}
            onChange={(e) => setDraft((d: SmtpDraft) => ({ ...d, smtpFrom: e.target.value }))}
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm disabled:opacity-60"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs label-caps text-on-surface-variant">{t('hub.notifications.smtpUser')}</span>
          <input
            type="text"
            value={values.smtpUser}
            disabled={!smtpEditable}
            onChange={(e) => setDraft((d: SmtpDraft) => ({ ...d, smtpUser: e.target.value }))}
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm disabled:opacity-60"
          />
        </label>
        <label className="block space-y-1 md:col-span-2">
          <span className="text-xs label-caps text-on-surface-variant">{t('hub.notifications.smtpTo')}</span>
          <input
            type="text"
            value={open ? toText : (config.smtp.smtpTo ?? []).join(', ')}
            disabled={!smtpEditable}
            onChange={(e) => setToText(e.target.value)}
            placeholder="ops@example.com, oncall@example.com"
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm disabled:opacity-60"
          />
        </label>
      </div>
      <p className="text-xs text-on-surface-variant">
        {t('hub.notifications.passwordEnv', { var: config.passwordHint })}
      </p>
    </div>
  )
}
