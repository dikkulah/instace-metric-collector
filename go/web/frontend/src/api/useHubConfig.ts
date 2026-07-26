import { useEffect, useState } from 'react'
import { apiGet } from './client'

export interface HubConfig {
  historySize: number
  version: string
  collectionIntervalMs: number
  staleAfterMs: number
  offlineAfterMs: number
}

const defaults: HubConfig = {
  historySize: 120,
  version: '',
  collectionIntervalMs: 60000,
  staleAfterMs: 120000,
  offlineAfterMs: 86400000,
}

export function useHubConfig() {
  const [config, setConfig] = useState<HubConfig>(defaults)

  useEffect(() => {
    apiGet<HubConfig>('/api/v1/hub/config')
      .then((data) => {
        if (data) setConfig({ ...defaults, ...data })
      })
      .catch(() => {})
  }, [])

  return config
}
