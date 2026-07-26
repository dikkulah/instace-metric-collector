import type { ReactNode } from 'react'

export type PageVariant = 'scroll' | 'workbench'

export function PageShell({
  title,
  variant = 'scroll',
  children,
}: {
  title?: ReactNode
  variant?: PageVariant
  children: ReactNode
}) {
  if (variant === 'workbench') {
    return (
      <div className="flex flex-col h-full min-h-0 gap-4">
        {title && <h1 className="text-2xl font-semibold shrink-0">{title}</h1>}
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="space-y-6">
        {title && <h1 className="text-2xl font-semibold">{title}</h1>}
        {children}
      </div>
    </div>
  )
}
