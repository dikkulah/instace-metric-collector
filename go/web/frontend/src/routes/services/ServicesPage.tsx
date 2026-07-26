import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { useHistoryView } from '../../context/HistoryViewContext'
import { EmptyState } from '../../components/EmptyState'
import { HistoryWorkbench } from '../../components/HistoryWorkbench'
import { ServiceSplitView } from '../../components/ServiceSplitView'
import type { SplitSurface } from '../../components/layout/MasterDetailLayout'

function ServicesContent({
  surface,
  selectedName,
  onSelect,
}: {
  surface: SplitSurface
  selectedName: string | null
  onSelect: (name: string) => void
}) {
  const { snapshot } = useMetricsContext()
  if (!snapshot) return null
  return (
    <ServiceSplitView
      surface={surface}
      services={snapshot.payload.serviceInfos}
      processes={snapshot.payload.processInfos}
      selectedName={selectedName}
      onSelect={onSelect}
    />
  )
}

export function ServicesPage({
  surface = 'page',
  showTitle = true,
}: {
  surface?: SplitSurface
  showTitle?: boolean
}) {
  const { t } = useTranslation()
  const { viewMode } = useHistoryView()
  const { snapshot } = useMetricsContext()
  const [params, setParams] = useSearchParams()
  const serviceName = params.get('service')

  const selected = useMemo(() => serviceName, [serviceName])

  const onSelect = (name: string) => {
    const next = new URLSearchParams(params)
    next.set('service', name)
    setParams(next)
  }

  const isWorkbench = surface === 'page'
  const historyMode = isWorkbench && viewMode === 'history'

  if (!historyMode && !snapshot) return <EmptyState message={t('app.waiting')} />

  if (!isWorkbench) {
    if (!snapshot) return <EmptyState message={t('app.waiting')} />
    return <ServicesContent surface={surface} selectedName={selected} onSelect={onSelect} />
  }

  return (
    <HistoryWorkbench title={showTitle ? t('services.pageTitle') : undefined} variant="workbench">
      <ServicesContent surface={surface} selectedName={selected} onSelect={onSelect} />
    </HistoryWorkbench>
  )
}
