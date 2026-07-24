import { useEffect, useState } from 'react'
import { apiGet } from './client'
import type { MetaResponse } from './types'

export function useMeta() {
  const [meta, setMeta] = useState<MetaResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<MetaResponse>('/api/meta')
      .then((data) => {
        if (data) setMeta(data)
        else setError('meta unavailable')
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  return { meta, error, loading: !meta && !error }
}
