import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPut } from './client'

export interface ProbeConfigResponse {
  targets: string[]
  timeoutMs: number
  source: 'env' | 'hub'
  envLocked: boolean
}

export function useHubProbeConfig() {
  const [config, setConfig] = useState<ProbeConfigResponse | null>(null)
  const [targetsText, setTargetsText] = useState('')
  const [timeoutMs, setTimeoutMs] = useState(3000)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    return apiGet<ProbeConfigResponse>('/api/v1/hub/probe-config')
      .then((data) => {
        if (!data) return
        setConfig(data)
        setTargetsText(data.targets.join('\n'))
        setTimeoutMs(data.timeoutMs)
        setError(null)
      })
      .catch(() => setError('load'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await apiPut<ProbeConfigResponse>('/api/v1/hub/probe-config', {
        targetsText,
        timeoutMs,
      })
      if (updated) {
        setConfig(updated)
        setTargetsText(updated.targets.join('\n'))
        setTimeoutMs(updated.timeoutMs)
      }
    } catch {
      setError('save')
    } finally {
      setSaving(false)
    }
  }, [targetsText, timeoutMs])

  return {
    config,
    targetsText,
    setTargetsText,
    timeoutMs,
    setTimeoutMs,
    loading,
    saving,
    error,
    save,
    reload,
  }
}
