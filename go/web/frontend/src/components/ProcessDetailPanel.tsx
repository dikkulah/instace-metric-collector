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
}: {
  p: ProcessInfo
  services: ServiceInfo[]
  processLinkPrefix?: string
  serviceLinkPrefix?: string
}) {
  const { t } = useTranslation()
  const related = findServicesForProcess(p, services)

  return (
    <div className="panel p-5 space-y-4 h-full overflow-auto">
      <h2 className="text-lg font-semibold">{t('processes.detail.title')}</h2>
      <DefinitionList
        items={[
          { label: 'PID', value: p.pid },
          { label: 'User', value: p.user },
          { label: 'CPU', value: `${p.cpuUsage.toFixed(1)}%` },
          { label: 'Memory', value: `${p.memoryUsage.toFixed(1)}%` },
        ]}
      />
      <div>
        <div className="label-caps mb-2">Command</div>
        <pre className="mono text-xs bg-surface-high p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{p.command}</pre>
      </div>
      <div>
        <div className="label-caps mb-2">{t('processes.detail.relatedServices')}</div>
        <p className="text-xs text-on-surface-variant mb-2">{t('processes.detail.relatedServicesHint')}</p>
        {related.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t('processes.detail.noRelatedServices')}</p>
        ) : (
          <ul className="space-y-2">
            {related.map(({ service, likely }) => (
              <li key={service.serviceName}>
                <Link
                  to={`${serviceLinkPrefix}?service=${encodeURIComponent(service.serviceName)}`}
                  className="text-sm text-primary hover:underline mono"
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
