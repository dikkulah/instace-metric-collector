import { useCallback, useRef } from 'react'

/** On narrow viewports, scroll the detail pane into view after master selection. */
export function useScrollDetailOnSelect() {
  const detailRef = useRef<HTMLDivElement>(null)

  const afterSelect = useCallback(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(min-width: 1024px)').matches) return
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  return { detailRef, afterSelect }
}
