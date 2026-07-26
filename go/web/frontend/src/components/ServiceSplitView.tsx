import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProcessInfo, ServiceInfo } from '../api/types'
import { SearchInput } from './SearchInput'
import { SegmentedControl } from './PillTabs'
import { StatusPill } from './StatusPill'
import { ServiceDetailPanel } from './ServiceDetailPanel'
import { MasterDetailLayout, type SplitSurface } from './layout/MasterDetailLayout'
import { ScrollPane } from './layout/ScrollPane'
import { useScrollDetailOnSelect } from '../hooks/useScrollDetailOnSelect'
import { serviceDomainPath } from '../lib/serviceProcessLink'

type ViewMode = 'tree' | 'list'

interface TreeNode {
  name: string
  fullPath: string
  children: Map<string, TreeNode>
  services: ServiceInfo[]
}

function insertService(root: TreeNode, service: ServiceInfo) {
  const parts = serviceDomainPath(service.serviceName)
  let node = root
  let path = ''
  for (const part of parts) {
    path = path ? `${path}.${part}` : part
    if (!node.children.has(part)) {
      node.children.set(part, { name: part, fullPath: path, children: new Map(), services: [] })
    }
    node = node.children.get(part)!
  }
  node.services.push(service)
}

function serviceLeafName(serviceName: string): string {
  const parts = serviceDomainPath(serviceName)
  return parts[parts.length - 1] ?? serviceName
}

function statusTone(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'RUNNING') return 'success'
  if (status === 'ERROR') return 'error'
  return 'neutral'
}

function renderServiceRow(
  svc: ServiceInfo,
  depth: number,
  indent: number,
  selected: ServiceInfo | null,
  onSelect: (name: string) => void,
  label: string,
) {
  return (
    <button
      key={svc.serviceName}
      type="button"
      onClick={() => onSelect(svc.serviceName)}
      style={{ paddingLeft: depth * 16 + indent }}
      className={`w-full text-left py-2 pr-3 flex items-center justify-between gap-2 border-l-2 min-w-0 ${
        selected?.serviceName === svc.serviceName
          ? 'bg-primary-container/15 border-l-primary'
          : 'border-l-transparent hover:bg-surface-high'
      }`}
    >
      <span className="mono text-sm truncate min-w-0" title={svc.serviceName}>
        {label}
      </span>
      <StatusPill label={svc.status} tone={statusTone(svc.status)} pulse={svc.status === 'RUNNING'} />
    </button>
  )
}

export function ServiceSplitView({
  services,
  processes,
  selectedName,
  onSelect,
  processLinkPrefix = '/processes',
  surface = 'page',
}: {
  services: ServiceInfo[]
  processes: ProcessInfo[]
  selectedName: string | null
  onSelect: (name: string) => void
  processLinkPrefix?: string
  surface?: SplitSurface
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<ViewMode>(surface === 'containerDetail' ? 'list' : 'tree')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const { detailRef, afterSelect } = useScrollDetailOnSelect()
  const compact = surface === 'containerDetail'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return services
    return services.filter(
      (s) => s.serviceName.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    )
  }, [services, search])

  const tree = useMemo(() => {
    const root: TreeNode = { name: '', fullPath: '', children: new Map(), services: [] }
    for (const s of filtered) insertService(root, s)
    return root
  }, [filtered])

  const selected = filtered.find((s) => s.serviceName === selectedName) ?? null

  const handleSelect = (name: string) => {
    onSelect(name)
    afterSelect()
  }

  const renderTree = (node: TreeNode, depth = 0): ReactNode[] => {
    const entries = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name))
    return entries.flatMap((child) => {
      const isBranch = child.children.size > 0
      const isOpen = expanded[child.fullPath] ?? depth < 2
      const rows: ReactNode[] = []

      if (isBranch) {
        rows.push(
          <button
            key={`branch:${child.fullPath}`}
            type="button"
            onClick={() => setExpanded((e) => ({ ...e, [child.fullPath]: !isOpen }))}
            style={{ paddingLeft: depth * 16 }}
            className="w-full text-left py-1.5 pr-3 flex items-center gap-2 hover:bg-surface-high min-w-0"
          >
            <span className="text-on-surface-variant w-4 shrink-0 text-center" aria-hidden>
              {isOpen ? '▾' : '▸'}
            </span>
            <span className="text-sm text-on-surface-variant truncate border-l border-outline-variant pl-2 min-w-0">
              {child.name}
            </span>
          </button>,
        )
      } else {
        for (const svc of child.services) {
          rows.push(
            renderServiceRow(svc, depth, 20, selected, handleSelect, serviceLeafName(svc.serviceName)),
          )
        }
      }

      if (isBranch && isOpen) {
        for (const svc of child.services) {
          rows.push(
            renderServiceRow(svc, depth, 20, selected, handleSelect, serviceLeafName(svc.serviceName)),
          )
        }
        rows.push(...renderTree(child, depth + 1))
      }

      return rows
    })
  }

  const master = (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className={`border-b border-outline-variant space-y-3 shrink-0 ${compact ? 'p-3' : 'p-4'}`}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('services.search')} />
        <SegmentedControl
          options={[
            { id: 'tree' as ViewMode, label: t('services.view.tree') },
            { id: 'list' as ViewMode, label: t('services.view.list') },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      <ScrollPane className="p-2">
        {mode === 'list' ? (
          filtered.map((s) => (
            <button
              key={s.serviceName}
              type="button"
              onClick={() => handleSelect(s.serviceName)}
              className={`w-full text-left p-3 flex items-center justify-between gap-2 border-b border-outline-variant/40 border-l-2 hover:bg-surface-high ${
                selected?.serviceName === s.serviceName
                  ? 'bg-primary-container/15 border-l-primary'
                  : 'border-l-transparent'
              }`}
            >
              <span className="mono text-sm break-all">{s.serviceName}</span>
              <StatusPill label={s.status} tone={statusTone(s.status)} pulse={s.status === 'RUNNING'} />
            </button>
          ))
        ) : (
          renderTree(tree)
        )}
      </ScrollPane>
    </div>
  )

  const detail = selected ? (
    <ServiceDetailPanel
      s={selected}
      processes={processes}
      processLinkPrefix={processLinkPrefix}
      compact={compact}
    />
  ) : (
    <div className="panel p-8 text-center text-on-surface-variant h-full flex items-center justify-center">
      {t('services.detail.pick')}
    </div>
  )

  return (
    <MasterDetailLayout surface={surface} masterRatio="60/40" master={master} detail={detail} detailRef={detailRef} />
  )
}
