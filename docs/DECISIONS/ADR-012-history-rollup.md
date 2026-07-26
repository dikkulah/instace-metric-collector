# ADR-012: History rollup tiers and resolution API

**Status:** Accepted (Jul 2026)  
**Phase:** G7b / Phase 10 prerequisite

## Context

G7 Tier 0 stores full `MetricsPayload` JSON per sample (`raw_samples`). Unbounded raw retention is expensive; Historic UI needs fast range queries. Principle from `HISTORY_ALERTS_DIAGNOSTICS_PLAN.md`: **ingest full payload; trim via retention and rollup, not field omission.**

## Decision

### Storage tiers

| Tier | Table | Content | Default retention |
|------|-------|---------|-------------------|
| 0 | `raw_samples` | Full `payload_json` + metadata | 30d dev / 7d `standard` / off `minimal` |
| 1 | `hourly_rollup` | Host summary + top-N process/service/container | 90d |
| 2 | `daily_summary` | CPU/RAM/disk/network aggregates | 365d |

Rollup jobs run before `RunRetention` deletes Tier 0 rows older than profile limit.

### API

Additive query parameter on history endpoints:

```
GET /api/v1/agents/{id}/history?from=&to=&resolution=raw|hourly|daily&limit=
```

Default `resolution=raw` preserves current behaviour (V6).

### Normalized samples (G7b optional slice)

`process_samples`, `service_samples`, `container_samples` — top-N per ingest for indexed drill-down. Full payload remains in Tier 0 for diagnostics correlation.

## Consequences

- P10 Historic UI reads `hourly` for 7-day charts, `raw` for short windows and drill-down.
- P12 `DISK_FILLING` insight uses Tier 1 series for linear extrapolation.
- Disk growth bounded by profile; document expected MB/agent/month in `DEPLOYMENT.md`.
- AI diagnostics (future) should read Tier 0/1 via store API — not log parsing (V16).

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Drop fields at ingest in prod | Breaks diagnostics and alert correlation |
| External TSDB (Prometheus) | Scope creep; contradicts positioning |
| Raw-only with client downsampling | Slow queries; large payloads over SSE |
