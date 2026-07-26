import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMetricsContext } from '../../context/MetricsContext'
import { useHistoryView } from '../../context/HistoryViewContext'
import { EmptyState } from '../../components/EmptyState'
import { HistoryWorkbench } from '../../components/HistoryWorkbench'
import { ProcessSplitView } from '../../components/ProcessSplitView'
import type { SplitSurface } from '../../components/layout/MasterDetailLayout'

function ProcessesContent({
  surface,
  selectedPid,
  onSelectPid,
}: {
  surface: SplitSurface
  selectedPid: number | null
  onSelectPid: (pid: number) => void
}) {
  const { snapshot } = useMetricsContext()
  if (!snapshot) return null
  return (
    <ProcessSplitView
      surface={surface}
      processes={snapshot.payload.processInfos}
      services={snapshot.payload.serviceInfos}
      selectedPid={selectedPid}
      onSelectPid={onSelectPid}
    />
  )
}

export function ProcessesPage({
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
  const pid = params.get('pid')

  const selectedPid = useMemo(() => {
    if (!pid) return null
    return Number(pid)
  }, [pid])

  const onSelectPid = (p: number) => {
    const next = new URLSearchParams(params)
    next.set('pid', String(p))
    setParams(next)
  }

  const isWorkbench = surface === 'page'
  const historyMode = isWorkbench && viewMode === 'history'

  if (!historyMode && !snapshot) return <EmptyState message={t('app.waiting')} />

  if (!isWorkbench) {
    if (!snapshot) return <EmptyState message={t('app.waiting')} />
    return (
      <ProcessesContent surface={surface} selectedPid={selectedPid} onSelectPid={onSelectPid} />
    )
  }

  return (
    <HistoryWorkbench title={showTitle ? t('processes.pageTitle') : undefined} variant="workbench">
      <ProcessesContent surface={surface} selectedPid={selectedPid} onSelectPid={onSelectPid} />
    </HistoryWorkbench>
  )
}
