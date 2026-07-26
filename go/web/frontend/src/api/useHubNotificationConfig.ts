import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPut } from './client'

export interface NotificationChannelStatus {
  enabled: boolean
  source: 'env' | 'hub' | 'none'
}

export interface HubNotificationConfig {
  channels: Record<string, NotificationChannelStatus>
  smtp: {
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpFrom: string
    smtpTo: string[]
  }
  smtpLocked: boolean
  passwordHint: string
}

const emptySmtp = {
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpFrom: '',
  smtpTo: [] as string[],
}

export function useHubNotificationConfig() {
  const [config, setConfig] = useState<HubNotificationConfig>({
    channels: {},
    smtp: emptySmtp,
    smtpLocked: false,
    passwordHint: 'METRICS_ALERTS_SMTP_PASSWORD',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    return apiGet<HubNotificationConfig>('/api/v1/hub/notification-config')
      .then((data) => {
        if (data) {
          setConfig({
            channels: data.channels ?? {},
            smtp: { ...emptySmtp, ...data.smtp, smtpTo: data.smtp?.smtpTo ?? [] },
            smtpLocked: data.smtpLocked ?? false,
            passwordHint: data.passwordHint ?? emptySmtp.smtpHost,
          })
        }
      })
      .catch(() => setError('load'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(async (smtp: HubNotificationConfig['smtp']) => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await apiPut<HubNotificationConfig>('/api/v1/hub/notification-config', smtp)
      setConfig((prev) => ({
        ...prev,
        ...updated,
        smtp: { ...emptySmtp, ...updated.smtp, smtpTo: updated.smtp?.smtpTo ?? [] },
      }))
      setSaved(true)
    } catch {
      setError('save')
    } finally {
      setSaving(false)
    }
  }, [])

  return { config, loading, saving, error, saved, save, reload }
}
