import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProcessInfo } from '../api/types'
import { SearchInput } from './SearchInput'
import { ProcessDetailPanel } from './ProcessDetailPanel'
import type { ServiceInfo } from '../api/types'

type SortKey = 'pid' | 'cpu' | 'mem' | 'user'

export function ProcessSplitView({
  processes,
  services,
  selectedPid,
  onSelectPid,
  processLinkPrefix = '/processes',
  serviceLinkPrefix = '/services',
}: {
  processes: ProcessInfo[]
  services: ServiceInfo[]
  selectedPid: number | null
  onSelectPid: (pid: number) => void
  processLinkPrefix?: string
  serviceLinkPrefix?: string
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('cpu')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = processes
    if (q) {
      rows = rows.filter(
        (p) =>
          String(p.pid).includes(q) ||
          p.user.toLowerCase().includes(q) ||
          p.command.toLowerCase().includes(q),
      )
    }
    return [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'pid') cmp = a.pid - b.pid
      else if (sortKey === 'cpu') cmp = a.cpuUsage - b.cpuUsage
      else if (sortKey === 'mem') cmp = a.memoryUsage - b.memoryUsage
      else cmp = a.user.localeCompare(b.user)
      return sortAsc ? cmp : -cmp
    })
  }, [processes, search, sortKey, sortAsc])

  const selected = filtered.find((p) => p.pid === selectedPid) ?? filtered[0] ?? null

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 min-h-[60vh]">
      <div className="panel overflow-hidden flex flex-col">
        <div className="p-4 border-b border-outline-variant">
          <SearchInput value={search} onChange={setSearch} placeholder={t('processes.search')} />
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left label-caps border-b border-outline-variant">
                <th className="p-3 cursor-pointer" onClick={() => toggleSort('pid')}>PID</th>
                <th className="p-3 cursor-pointer" onClick={() => toggleSort('user')}>User</th>
                <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('cpu')}>CPU</th>
                <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('mem')}>Mem</th>
                <th className="p-3">Command</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.pid}
                  onClick={() => onSelectPid(p.pid)}
                  className={`border-b border-outline-variant/40 cursor-pointer hover:bg-surface-high ${
                    selected?.pid === p.pid ? 'bg-primary-container/15 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <td className="p-3 mono">{p.pid}</td>
                  <td className="p-3">{p.user}</td>
                  <td className="p-3 text-right mono">{p.cpuUsage.toFixed(1)}</td>
                  <td className="p-3 text-right mono">{p.memoryUsage.toFixed(1)}</td>
                  <td className="p-3 mono truncate max-w-[200px]">{p.command}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="min-h-[200px]">
        {selected ? (
          <ProcessDetailPanel
            p={selected}
            services={services}
            processLinkPrefix={processLinkPrefix}
            serviceLinkPrefix={serviceLinkPrefix}
          />
        ) : (
          <div className="panel p-8 text-center text-on-surface-variant">{t('processes.detail.pick')}</div>
        )}
      </div>
    </div>
  )
}
