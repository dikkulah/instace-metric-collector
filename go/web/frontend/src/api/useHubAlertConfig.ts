import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPut } from './client'

export interface HubAlertConfig {
  cpuPercent: number
  memoryPercent: number
  diskPercent: number
  cooldownMinutes: number
  staleMultiplier: number
  cpuSpikeMinPercent: number
  memoryPressurePercent: number
  diskFillingPercent: number
  containerRestartCount: number
}

const defaults: HubAlertConfig = {
  cpuPercent: 90,
  memoryPercent: 90,
  diskPercent: 90,
  cooldownMinutes: 10,
  staleMultiplier: 2,
  cpuSpikeMinPercent: 50,
  memoryPressurePercent: 85,
  diskFillingPercent: 85,
  containerRestartCount: 3,
}

export function useHubAlertConfig() {
  const [config, setConfig] = useState<HubAlertConfig>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    apiGet<HubAlertConfig>('/api/v1/hub/alert-config')
      .then((data) => {
        if (data) setConfig({ ...defaults, ...data })
      })
      .catch(() => setError('load'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const save = useCallback(async (next: HubAlertConfig) => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await apiPut<HubAlertConfig>('/api/v1/hub/alert-config', next)
      setConfig({ ...defaults, ...updated })
      setSaved(true)
    } catch {
      setError('save')
    } finally {
      setSaving(false)
    }
  }, [])

  return { config, setConfig, loading, saving, error, saved, save, reload }
}
