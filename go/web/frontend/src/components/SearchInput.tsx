export function SearchInput({
  value,
  onChange,
  placeholder,
  shortcut,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  shortcut?: string
}) {
  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-3 pr-16 py-2 rounded-lg bg-surface-high border border-outline-variant text-sm placeholder:text-on-surface-variant/70"
      />
      {shortcut && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant border border-outline-variant rounded px-1.5 py-0.5">
          {shortcut}
        </span>
      )}
    </div>
  )
}
