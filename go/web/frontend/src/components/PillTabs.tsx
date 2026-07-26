export function PillTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}) {
  const idx = Math.max(tabs.findIndex((t) => t.id === active), 0)
  const colCount = tabs.length

  return (
    <div
      className="relative grid p-1 rounded-lg bg-surface-high border border-outline-variant gap-1"
      style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
    >
      <span
        className="absolute top-1 bottom-1 rounded-md bg-primary-container transition-all duration-200"
        style={{
          left: `calc(${idx} * (100% / ${colCount}) + 4px)`,
          width: `calc(100% / ${colCount} - 8px)`,
        }}
        aria-hidden
      />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`relative z-10 px-4 py-2 rounded-md text-sm font-medium transition-colors text-center ${
            active === tab.id ? 'text-white' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return <PillTabs tabs={options} active={value} onChange={onChange} />
}
