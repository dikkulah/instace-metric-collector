import type { ReactNode } from 'react'

export function ScrollPane({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-pane pb-3 ${className}`}>
      {children}
    </div>
  )
}
