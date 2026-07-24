import type { ProcessInfo, ServiceInfo } from '../api/types'

function normalizeToken(value: string): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function serviceTokens(serviceName: string) {
  const full = String(serviceName || '').toLowerCase()
  const parts = full.split(/[./]/).filter(Boolean)
  let leaf = parts[parts.length - 1] || full
  leaf = leaf.replace(/\.service$/i, '')
  return { full, parts, leaf, leafNorm: normalizeToken(leaf) }
}

function processTokens(proc: ProcessInfo) {
  const cmd = String(proc?.command || '').toLowerCase()
  const base = cmd.split(/\s+/)[0]?.split('/').pop() || ''
  const baseClean = base.replace(/\.(exe|jar|app)$/i, '')
  return { cmd, base: baseClean, baseNorm: normalizeToken(baseClean) }
}

export function scoreServiceProcess(service: ServiceInfo, proc: ProcessInfo): number {
  if (!service?.serviceName || !proc) return 0
  const st = serviceTokens(service.serviceName)
  const pt = processTokens(proc)
  if (!st.leafNorm || !pt.baseNorm) return 0
  if (pt.baseNorm === st.leafNorm) return 100
  if (pt.cmd.includes(st.full)) return 90
  if (pt.baseNorm.includes(st.leafNorm) || st.leafNorm.includes(pt.baseNorm)) return 75
  for (const seg of st.parts) {
    const segNorm = normalizeToken(seg)
    if (segNorm.length >= 4 && (pt.baseNorm.includes(segNorm) || pt.cmd.includes(seg))) return 65
  }
  return 0
}

export function findProcessesForService(
  service: ServiceInfo,
  processes: ProcessInfo[],
  { limit = 20, minScore = 55 } = {},
) {
  return processes
    .map((proc) => ({ proc, score: scoreServiceProcess(service, proc) }))
    .filter((e) => e.score >= minScore)
    .sort((a, b) => b.score - a.score || (b.proc.cpuUsage || 0) - (a.proc.cpuUsage || 0))
    .slice(0, limit)
    .map((e) => ({ proc: e.proc, score: e.score, likely: e.score < 85 }))
}

export function findServicesForProcess(
  proc: ProcessInfo,
  services: ServiceInfo[],
  { limit = 15, minScore = 55 } = {},
) {
  return services
    .map((service) => ({ service, score: scoreServiceProcess(service, proc) }))
    .filter((e) => e.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((e) => ({ service: e.service, score: e.score, likely: e.score < 85 }))
}

export function serviceDomainPath(serviceName: string): string[] {
  return serviceName.split(/[./]/).filter(Boolean)
}
