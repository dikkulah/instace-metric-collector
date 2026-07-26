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
  compact = false,
}: {
  s: ServiceInfo
  processes: ProcessInfo[]
  processLinkPrefix?: string
  compact?: boolean
}) {
  const { t } = useTranslation()
  const related = findProcessesForService(s, processes)
  const path = serviceDomainPath(s.serviceName)

  return (
    <div className={`panel space-y-4 h-full max-h-full overflow-hidden flex flex-col min-w-0 ${compact ? 'p-4' : 'p-5'}`}>
      <h2 className={`font-semibold ${compact ? 'text-base' : 'text-lg'}`}>{t('services.detail.title')}</h2>
      <StatusPill label={s.status} tone={statusTone(s.status)} pulse={s.status === 'RUNNING'} />
      <DefinitionList
        items={[
          { label: t('services.detail.name'), value: s.serviceName },
          { label: t('services.detail.description'), value: s.description || '—', mono: false },
        ]}
      />
      <div>
        <div className="label-caps mb-2">{t('services.detail.breadcrumb')}</div>
        <div className="text-sm mono text-on-surface-variant break-all">
          {path.join(' › ')}
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="label-caps mb-2">{t('services.detail.relatedProcesses')}</div>
        <p className="text-xs text-on-surface-variant mb-2">{t('services.detail.relatedProcessesHint')}</p>
        {related.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t('services.detail.noRelatedProcesses')}</p>
        ) : (
          <ul className="space-y-2">
            {related.map(({ proc, likely }) => (
              <li key={proc.pid} className="min-w-0">
                <Link
                  to={`${processLinkPrefix}?pid=${proc.pid}`}
                  className="text-sm text-primary hover:underline mono block truncate"
                  title={proc.command}
                >
                  {likely ? `~ PID ${proc.pid}` : `PID ${proc.pid}`} — {proc.command}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
