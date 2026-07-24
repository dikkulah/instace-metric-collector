import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProcessInfo, ServiceInfo } from '../api/types'
import { SearchInput } from './SearchInput'
import { SegmentedControl } from './PillTabs'
import { StatusPill } from './StatusPill'
import { ServiceDetailPanel } from './ServiceDetailPanel'
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

function statusTone(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'RUNNING') return 'success'
  if (status === 'ERROR') return 'error'
  return 'neutral'
}

export function ServiceSplitView({
  services,
  processes,
  selectedName,
  onSelect,
  processLinkPrefix = '/processes',
}: {
  services: ServiceInfo[]
  processes: ProcessInfo[]
  selectedName: string | null
  onSelect: (name: string) => void
  processLinkPrefix?: string
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<ViewMode>('tree')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

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

  const selected = filtered.find((s) => s.serviceName === selectedName) ?? filtered[0] ?? null

  const renderTree = (node: TreeNode, depth = 0): ReactNode[] => {
    const entries = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name))
    return entries.flatMap((child) => {
      const isOpen = expanded[child.fullPath] ?? depth < 2
      const rows = []
      if (child.services.length === 0 && child.children.size > 0) {
        rows.push(
          <div key={child.fullPath} style={{ paddingLeft: depth * 16 }} className="flex items-center gap-2 py-1">
            <button type="button" onClick={() => setExpanded((e) => ({ ...e, [child.fullPath]: !isOpen }))} className="text-on-surface-variant w-4">
              {isOpen ? '▾' : '▸'}
            </button>
            <span className="text-sm text-on-surface-variant border-l border-outline-variant pl-2">{child.name}</span>
          </div>,
        )
      }
      if (isOpen) {
        for (const svc of child.services) {
          rows.push(
            <button
              key={svc.serviceName}
              type="button"
              onClick={() => onSelect(svc.serviceName)}
              style={{ paddingLeft: (depth + 1) * 16 }}
              className={`w-full text-left py-2 pr-3 flex items-center justify-between gap-2 border-l border-outline-variant hover:bg-surface-high ${
                selected?.serviceName === svc.serviceName ? 'bg-primary-container/15 border-l-primary' : ''
              }`}
            >
              <span className="mono text-sm truncate">{svc.serviceName}</span>
              <StatusPill label={svc.status} tone={statusTone(svc.status)} pulse={svc.status === 'RUNNING'} />
            </button>,
          )
        }
        rows.push(...renderTree(child, depth + 1))
      }
      return rows
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 min-h-[60vh]">
      <div className="panel overflow-hidden flex flex-col">
        <div className="p-4 border-b border-outline-variant space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder={t('services.search')} />
          <SegmentedControl
            options={[
              { id: 'tree' as ViewMode, label: 'Tree' },
              { id: 'list' as ViewMode, label: 'List' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {mode === 'list' ? (
            filtered.map((s) => (
              <button
                key={s.serviceName}
                type="button"
                onClick={() => onSelect(s.serviceName)}
                className={`w-full text-left p-3 flex items-center justify-between gap-2 border-b border-outline-variant/40 hover:bg-surface-high ${
                  selected?.serviceName === s.serviceName ? 'bg-primary-container/15 border-l-2 border-l-primary' : ''
                }`}
              >
                <span className="mono text-sm break-all">{s.serviceName}</span>
                <StatusPill label={s.status} tone={statusTone(s.status)} pulse={s.status === 'RUNNING'} />
              </button>
            ))
          ) : (
            renderTree(tree)
          )}
        </div>
      </div>
      <div>
        {selected ? (
          <ServiceDetailPanel s={selected} processes={processes} processLinkPrefix={processLinkPrefix} />
        ) : (
          <div className="panel p-8 text-center text-on-surface-variant">{t('services.detail.pick')}</div>
        )}
      </div>
    </div>
  )
}
