import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { EmptyState } from '../../components/EmptyState'
import { ServiceSplitView } from '../../components/ServiceSplitView'

export function ServicesPage() {
  const { t } = useTranslation()
  const { snapshot } = useMetricsContext()
  const [params, setParams] = useSearchParams()
  const serviceName = params.get('service')

  const selected = useMemo(() => serviceName, [serviceName])

  if (!snapshot) return <EmptyState message={t('app.waiting')} />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('services.pageTitle')}</h1>
      <ServiceSplitView
        services={snapshot.payload.serviceInfos}
        processes={snapshot.payload.processInfos}
        selectedName={selected ?? snapshot.payload.serviceInfos[0]?.serviceName ?? null}
        onSelect={(name) => setParams({ service: name })}
      />
    </div>
  )
}
