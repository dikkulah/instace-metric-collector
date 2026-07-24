# ADR-006: Hub topology and agent push (Phase 7 / MVP-2)

## Status

Accepted — Phase 7

## Context

MVP-1 delivered a single-host agent with local dashboard. MVP-2 requires a central hub for multi-agent visibility and webhook alerts. Phase 2 HTTP push evolves into hub ingest rather than a generic unknown endpoint.

## Decision

### Deployment modes (same JAR)

| Mode | Properties | Role |
|------|------------|------|
| Agent (default) | `metrics.push.enabled=false` | Collect + log + optional local UI |
| Agent + push | `metrics.push.enabled=true` | Also `POST` payload to hub ingest |
| Hub | `metrics.hub.enabled=true` | Accept ingest, agent list API, hub UI, alerts |

### Ingest API

```
POST /api/v1/ingest
Authorization: Bearer <token>   # optional when metrics.hub.ingest.token set
{
  "agentId": "server-01",
  "hostname": "app-host",
  "payload": { ... MetricsPayload ... }
}
```

### Hub storage

In-memory per-agent ring buffer (`HubAgentRegistry`). No persistence in MVP-2 (SQLite deferred to MVP-3 M18).

### Alerts

After each ingest, `AlertService` evaluates:

- CPU ≥ `metrics.alerts.cpu-threshold`
- Memory ratio ≥ `metrics.alerts.memory-threshold`
- Container `exited` or `unhealthy`

Fires JSON `POST` to `metrics.alerts.webhook-url` with cooldown (`metrics.alerts.cooldown-seconds`).

### UI

- Hub dashboard: `/hub.html` — agent grid + per-agent detail
- Local agent dashboard unchanged: `/`

### Phase 2 alignment (V12)

Push is enabled only via `metrics.push.enabled=true` targeting the documented ingest URL. Failures are logged; collection and local log output continue.

## Consequences

- Hub and agent can run in one process for dev (`hub.enabled=true` + `push.enabled=true` loopback).
- Production: dedicated hub instance recommended; set ingest token.
- Multi-tenant isolation (Phase 8) not included.
