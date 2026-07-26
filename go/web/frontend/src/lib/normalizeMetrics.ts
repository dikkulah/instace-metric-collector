import type { MetricsPayload, MetricsSnapshot } from '../api/types'

/** Hourly/daily rollups may omit arrays; coerce null to [] so UI never crashes. */
export function normalizeMetricsPayload(payload: MetricsPayload): MetricsPayload {
  return {
    ...payload,
    processInfos: payload.processInfos ?? [],
    serviceInfos: payload.serviceInfos ?? [],
    containers: payload.containers ?? [],
    diskUsage: payload.diskUsage ?? [],
    networkUsage: payload.networkUsage ?? [],
  }
}

export function normalizeMetricsSnapshot(snapshot: MetricsSnapshot): MetricsSnapshot {
  return {
    ...snapshot,
    payload: normalizeMetricsPayload(snapshot.payload),
  }
}
