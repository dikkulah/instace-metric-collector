import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProcessInfo, ServiceInfo } from '../api/types'
import { SearchInput } from './SearchInput'
import { ProcessDetailPanel } from './ProcessDetailPanel'
import { MasterDetailLayout, type SplitSurface } from './layout/MasterDetailLayout'
import { ScrollPane } from './layout/ScrollPane'
import { useScrollDetailOnSelect } from '../hooks/useScrollDetailOnSelect'

type SortKey = 'pid' | 'cpu' | 'mem' | 'user'

export function ProcessSplitView({
  processes,
  services,
  selectedPid,
  onSelectPid,
  processLinkPrefix = '/processes',
  serviceLinkPrefix = '/services',
  surface = 'page',
}: {
  processes: ProcessInfo[]
  services: ServiceInfo[]
  selectedPid: number | null
  onSelectPid: (pid: number) => void
  processLinkPrefix?: string
  serviceLinkPrefix?: string
  surface?: SplitSurface
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('cpu')
  const [sortAsc, setSortAsc] = useState(false)
  const { detailRef, afterSelect } = useScrollDetailOnSelect()
  const compact = surface === 'containerDetail'

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

  const selected = filtered.find((p) => p.pid === selectedPid) ?? null

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const handleSelect = (pid: number) => {
    onSelectPid(pid)
    afterSelect()
  }

  const showUserColumn = !compact
  const showCommandColumn = !compact

  const master = (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="p-3 border-b border-outline-variant shrink-0">
        <SearchInput value={search} onChange={setSearch} placeholder={t('processes.search')} />
      </div>
      <ScrollPane>
        <table className={`w-full text-sm ${compact ? '' : 'table-fixed'}`}>
          <thead className="sticky top-0 bg-surface z-10">
            <tr className="text-left label-caps border-b border-outline-variant">
              <th className="p-2.5 w-16 cursor-pointer" onClick={() => toggleSort('pid')}>
                {t('table.pid')}
              </th>
              {showUserColumn && (
                <th className="p-2.5 w-24 cursor-pointer" onClick={() => toggleSort('user')}>
                  {t('table.user')}
                </th>
              )}
              <th className="p-2.5 w-14 text-right cursor-pointer" onClick={() => toggleSort('cpu')}>
                {t('table.cpu')}
              </th>
              <th className="p-2.5 w-14 text-right cursor-pointer" onClick={() => toggleSort('mem')}>
                {t('table.memory')}
              </th>
              {showCommandColumn && (
                <th className="p-2.5">{t('processes.table.command')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.pid}
                onClick={() => handleSelect(p.pid)}
                className={`border-b border-outline-variant/40 cursor-pointer hover:bg-surface-high border-l-2 ${
                  selected?.pid === p.pid
                    ? 'bg-primary-container/15 border-l-primary'
                    : 'border-l-transparent'
                }`}
              >
                <td className="p-2.5 mono">{p.pid}</td>
                {showUserColumn && <td className="p-2.5 truncate">{p.user}</td>}
                <td className="p-2.5 text-right mono">{p.cpuUsage.toFixed(1)}</td>
                <td className="p-2.5 text-right mono">{p.memoryUsage.toFixed(1)}</td>
                {showCommandColumn && (
                  <td className="p-2.5 mono truncate" title={p.command}>
                    {p.command}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollPane>
    </div>
  )

  const detail = selected ? (
    <ProcessDetailPanel
      p={selected}
      services={services}
      processLinkPrefix={processLinkPrefix}
      serviceLinkPrefix={serviceLinkPrefix}
      compact={compact}
    />
  ) : (
    <div className="panel p-8 text-center text-on-surface-variant h-full flex items-center justify-center">
      {t('processes.detail.pick')}
    </div>
  )

  return (
    <MasterDetailLayout surface={surface} masterRatio="60/40" master={master} detail={detail} detailRef={detailRef} />
  )
}
