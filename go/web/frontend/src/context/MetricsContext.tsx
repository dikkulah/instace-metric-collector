import { createContext, useContext } from 'react'
import type { MetricsSnapshot } from '../api/types'
import { useMetrics } from '../api/useMetrics'

export interface MetricsContextValue {
  snapshot: MetricsSnapshot | null
  live: boolean
  lastUpdate: Date | null
}

export const MetricsContext = createContext<MetricsContextValue | null>(null)

export function useMetricsContext(): MetricsContextValue {
  const ctx = useContext(MetricsContext)
  const fallback = useMetrics()
  return ctx ?? fallback
}
