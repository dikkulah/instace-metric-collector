import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProcessInfo, ServiceInfo } from '../api/types'
import { DefinitionList } from './DefinitionList'
import { StatusPill } from './StatusPill'
import { findProcessesForService, serviceDomainPath } from '../lib/serviceProcessLink'

function statusTone(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'RUNNING') return 'success'
  if (status === 'ERROR') return 'error'
  return 'neutral'
}

export function ServiceDetailPanel({
  s,
  processes,
  processLinkPrefix = '/processes',
}: {
  s: ServiceInfo
  processes: ProcessInfo[]
  processLinkPrefix?: string
}) {
  const { t } = useTranslation()
  const related = findProcessesForService(s, processes)
  const path = serviceDomainPath(s.serviceName)

  return (
    <div className="panel p-5 space-y-4 h-full overflow-auto">
      <h2 className="text-lg font-semibold">{t('services.detail.title')}</h2>
      <StatusPill label={s.status} tone={statusTone(s.status)} pulse={s.status === 'RUNNING'} />
      <DefinitionList
        items={[
          { label: t('services.detail.name'), value: s.serviceName },
          { label: t('services.detail.description'), value: s.description || '—', mono: false },
        ]}
      />
      <div>
        <div className="label-caps mb-2">{t('services.detail.breadcrumb')}</div>
        <div className="text-sm mono text-on-surface-variant">
          {path.join(' › ')}
        </div>
      </div>
      <div>
        <div className="label-caps mb-2">{t('services.detail.relatedProcesses')}</div>
        <p className="text-xs text-on-surface-variant mb-2">{t('services.detail.relatedProcessesHint')}</p>
        {related.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t('services.detail.noRelatedProcesses')}</p>
        ) : (
          <ul className="space-y-2">
            {related.map(({ proc, likely }) => (
              <li key={proc.pid}>
                <Link
                  to={`${processLinkPrefix}?pid=${proc.pid}`}
                  className="text-sm text-primary hover:underline mono"
                >
                  {likely ? `~ PID ${proc.pid}` : `PID ${proc.pid}`} — {proc.command.slice(0, 60)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
