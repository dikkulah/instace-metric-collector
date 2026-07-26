import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProcessInfo } from '../api/types'
import { DefinitionList } from './DefinitionList'
import { findServicesForProcess } from '../lib/serviceProcessLink'
import type { ServiceInfo } from '../api/types'

export function ProcessDetailPanel({
  p,
  services,
  processLinkPrefix: _processLinkPrefix = '/processes',
  serviceLinkPrefix = '/services',
  compact = false,
}: {
  p: ProcessInfo
  services: ServiceInfo[]
  processLinkPrefix?: string
  serviceLinkPrefix?: string
  compact?: boolean
}) {
  const { t } = useTranslation()
  const related = findServicesForProcess(p, services)

  return (
    <div className={`panel space-y-4 h-full overflow-hidden flex flex-col min-w-0 ${compact ? 'p-4' : 'p-5'}`}>
      <h2 className={`font-semibold shrink-0 ${compact ? 'text-base' : 'text-lg'}`}>{t('processes.detail.title')}</h2>
      <DefinitionList
        items={[
          { label: t('table.pid'), value: p.pid },
          { label: t('table.user'), value: p.user },
          { label: t('table.cpu'), value: `${p.cpuUsage.toFixed(1)}%` },
          { label: t('table.memory'), value: `${p.memoryUsage.toFixed(1)}%` },
        ]}
      />
      <div className="min-w-0">
        <div className="label-caps mb-2">{t('processes.detail.command')}</div>
        <pre className={`mono text-xs bg-surface-high p-3 rounded-lg overflow-hidden whitespace-pre-wrap break-all overflow-y-auto ${
          compact ? 'max-h-28' : 'max-h-40'
        }`}>
          {p.command}
        </pre>
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="label-caps mb-2">{t('processes.detail.relatedServices')}</div>
        <p className="text-xs text-on-surface-variant mb-2">{t('processes.detail.relatedServicesHint')}</p>
        {related.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t('processes.detail.noRelatedServices')}</p>
        ) : (
          <ul className="space-y-2">
            {related.map(({ service, likely }) => (
              <li key={service.serviceName} className="min-w-0">
                <Link
                  to={`${serviceLinkPrefix}?service=${encodeURIComponent(service.serviceName)}`}
                  className="text-sm text-primary hover:underline mono block truncate"
                  title={`${likely ? '~ ' : ''}${service.serviceName}`}
                >
                  {likely ? `~ ${service.serviceName}` : service.serviceName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
