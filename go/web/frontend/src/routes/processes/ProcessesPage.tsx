import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { EmptyState } from '../../components/EmptyState'
import { ProcessSplitView } from '../../components/ProcessSplitView'

export function ProcessesPage() {
  const { t } = useTranslation()
  const { snapshot } = useMetricsContext()
  const [params, setParams] = useSearchParams()
  const pid = params.get('pid')

  const selectedPid = useMemo(() => {
    if (!pid) return null
    return Number(pid)
  }, [pid])

  if (!snapshot) return <EmptyState message={t('app.waiting')} />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('processes.pageTitle')}</h1>
      <ProcessSplitView
        processes={snapshot.payload.processInfos}
        services={snapshot.payload.serviceInfos}
        selectedPid={selectedPid ?? snapshot.payload.processInfos[0]?.pid ?? null}
        onSelectPid={(p) => setParams({ pid: String(p) })}
      />
    </div>
  )
}
