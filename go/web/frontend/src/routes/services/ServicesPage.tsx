import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { EmptyState } from '../../components/EmptyState'
import { ServiceSplitView } from '../../components/ServiceSplitView'
import { PageShell } from '../../components/layout/PageShell'
import type { SplitSurface } from '../../components/layout/MasterDetailLayout'

export function ServicesPage({
  surface = 'page',
  showTitle = true,
}: {
  surface?: SplitSurface
  showTitle?: boolean
}) {
  const { t } = useTranslation()
  const { snapshot } = useMetricsContext()
  const [params, setParams] = useSearchParams()
  const serviceName = params.get('service')

  const selected = useMemo(() => serviceName, [serviceName])

  if (!snapshot) return <EmptyState message={t('app.waiting')} />

  const isWorkbench = surface === 'page'

  return (
    <PageShell
      title={isWorkbench && showTitle ? t('services.pageTitle') : undefined}
      variant={isWorkbench ? 'workbench' : 'scroll'}
    >
      <ServiceSplitView
        surface={surface}
        services={snapshot.payload.serviceInfos}
        processes={snapshot.payload.processInfos}
        selectedName={selected}
        onSelect={(name) => {
          const next = new URLSearchParams(params)
          next.set('service', name)
          setParams(next)
        }}
      />
    </PageShell>
  )
}
