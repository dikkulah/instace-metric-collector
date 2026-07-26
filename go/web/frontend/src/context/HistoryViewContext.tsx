import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type ViewMode = 'live' | 'history'
export type HistoryTimeRange = '1h' | '6h' | '24h' | '7d'

export interface HistoryViewState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  timeRange: HistoryTimeRange
  setTimeRange: (range: HistoryTimeRange) => void
}

const HistoryViewContext = createContext<HistoryViewState | null>(null)

export function HistoryViewProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('live')
  const [timeRange, setTimeRange] = useState<HistoryTimeRange>('24h')

  const value = useMemo(
    () => ({ viewMode, setViewMode, timeRange, setTimeRange }),
    [viewMode, timeRange],
  )

  return <HistoryViewContext.Provider value={value}>{children}</HistoryViewContext.Provider>
}

export function useHistoryView(): HistoryViewState {
  const ctx = useContext(HistoryViewContext)
  if (!ctx) {
    throw new Error('useHistoryView must be used within HistoryViewProvider')
  }
  return ctx
}
