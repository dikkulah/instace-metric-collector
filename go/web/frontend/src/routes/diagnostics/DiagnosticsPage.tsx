import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDiagnostics } from '../../api/useDiagnostics'
import { useHubAgents } from '../../api/useHubAgents'
import { DiagnosticPanel } from '../../components/DiagnosticPanel'
import { EmptyState } from '../../components/EmptyState'
import { PageShell } from '../../components/layout/PageShell'

function ExportButton({ items }: { items: ReturnType<typeof useDiagnostics> }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  if (items.length === 0) return null
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(JSON.stringify(items, null, 2))
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }}
      className="px-3 py-1.5 rounded-md text-xs border border-outline-variant hover:bg-surface-high"
    >
      {copied ? t('diagnostics.exported') : t('diagnostics.export')}
    </button>
  )
}

function AgentDiagnosticsBlock({ agentId, hostname }: { agentId: string; hostname: string }) {
  const items = useDiagnostics(agentId)
  if (items.length === 0) return null
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{hostname}</h2>
        <p className="text-xs mono text-on-surface-variant">{agentId}</p>
      </div>
      <DiagnosticPanel items={items} />
    </section>
  )
}

function SingleAgentDiagnostics({ agentId }: { agentId: string }) {
  const { t } = useTranslation()
  const agents = useHubAgents()
  const items = useDiagnostics(agentId)
  const agent = agents.find((a) => a.agentId === agentId)

  return (
    <PageShell title={t('diagnostics.pageTitle')} variant="scroll">
      <div className="flex flex-wrap items-center justify-between gap-3 -mt-2 mb-6">
        <p className="text-sm text-on-surface-variant">{t('diagnostics.subtitle')}</p>
        <ExportButton items={items} />
      </div>
      {agent && (
        <p className="text-sm text-on-surface-variant mb-4">
          {agent.hostname} <span className="mono text-xs">({agentId})</span>
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState message={t('diagnostics.empty')} />
      ) : (
        <DiagnosticPanel items={items} />
      )}
    </PageShell>
  )
}

function AllAgentsDiagnostics() {
  const { t } = useTranslation()
  const agents = useHubAgents()

  if (agents.length === 0) {
    return (
      <PageShell title={t('diagnostics.pageTitle')} variant="scroll">
        <EmptyState message={t('hub.noAgents')} />
      </PageShell>
    )
  }

  return (
    <PageShell title={t('diagnostics.pageTitle')} variant="scroll">
      <p className="text-sm text-on-surface-variant -mt-2 mb-6">{t('diagnostics.allAgentsSubtitle')}</p>
      <div className="space-y-8">
        {agents.map((a) => (
          <AgentDiagnosticsBlock key={a.agentId} agentId={a.agentId} hostname={a.hostname} />
        ))}
      </div>
    </PageShell>
  )
}

export function DiagnosticsPage() {
  const { agentId } = useParams<{ agentId?: string }>()
  if (agentId) return <SingleAgentDiagnostics agentId={agentId} />
  return <AllAgentsDiagnostics />
}
