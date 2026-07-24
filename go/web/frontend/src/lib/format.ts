export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes
  let i = -1
  do {
    v /= 1024
    i++
  } while (v >= 1024 && i < units.length - 1)
  return `${v.toFixed(1)} ${units[i]}`
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

export function formatTime(d: Date | null, locale: string): string {
  if (!d) return '—'
  return d.toLocaleTimeString(locale)
}

export function isAgentContainer(c: { name: string; image: string }): boolean {
  const hay = `${c.name} ${c.image}`.toLowerCase()
  return hay.includes('metrics-collector') || hay.includes('metric-collector')
}
