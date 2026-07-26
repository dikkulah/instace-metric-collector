import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { EmptyState } from '../../components/EmptyState'
import { ProcessSplitView } from '../../components/ProcessSplitView'
import { PageShell } from '../../components/layout/PageShell'
import type { SplitSurface } from '../../components/layout/MasterDetailLayout'

export function ProcessesPage({
  surface = 'page',
  showTitle = true,
}: {
  surface?: SplitSurface
  showTitle?: boolean
}) {
  const { t } = useTranslation()
  const { snapshot } = useMetricsContext()
  const [params, setParams] = useSearchParams()
  const pid = params.get('pid')

  const selectedPid = useMemo(() => {
    if (!pid) return null
    return Number(pid)
  }, [pid])

  if (!snapshot) return <EmptyState message={t('app.waiting')} />

  const isWorkbench = surface === 'page'

  return (
    <PageShell
      title={isWorkbench && showTitle ? t('processes.pageTitle') : undefined}
      variant={isWorkbench ? 'workbench' : 'scroll'}
    >
      <ProcessSplitView
        surface={surface}
        processes={snapshot.payload.processInfos}
        services={snapshot.payload.serviceInfos}
        selectedPid={selectedPid}
        onSelectPid={(p) => {
          const next = new URLSearchParams(params)
          next.set('pid', String(p))
          setParams(next)
        }}
      />
    </PageShell>
  )
}
