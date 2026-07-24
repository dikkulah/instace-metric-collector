import type { ReactNode } from 'react'

export function DefinitionList({ items }: { items: { label: string; value: ReactNode; mono?: boolean }[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-on-surface-variant text-sm mb-0.5">{item.label}</dt>
          <dd className={item.mono !== false ? 'mono break-all' : 'break-all'}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
