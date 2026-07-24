# Hub deployment (Phase 7 / MVP-2)

Central hub for multi-agent metrics and webhook alerts.

## Architecture

```
Agent (metrics.push.enabled=true)     Hub (metrics.hub.enabled=true)
        │                                      │
        └── POST /api/v1/ingest ──────────────►│ HubAgentRegistry
                                               ├── GET /api/v1/agents
                                               ├── AlertService → webhook
                                               └── /hub.html
```

ADR: [`DECISIONS/ADR-006-hub-topology.md`](DECISIONS/ADR-006-hub-topology.md)

## Hub server

```properties
metrics.hub.enabled=true
metrics.hub.ingest.token=change-me-in-production
metrics.alerts.webhook-url=https://hooks.slack.com/services/...
metrics.alerts.cpu-threshold=0.90
metrics.alerts.memory-threshold=0.90
```

```bash
make run
open http://localhost:8080/hub.html
```

## Agent push

On each host running the agent:

```properties
metrics.push.enabled=true
metrics.push.ingest-url=http://hub-host:8080/api/v1/ingest
metrics.push.agent-id=my-server-01
metrics.push.auth-token=change-me-in-production
```

Agent continues JSON logging and optional local dashboard (`metrics.ui.enabled`).

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ingest` | Agent payload ingest |
| GET | `/api/v1/agents` | Agent summaries |
| GET | `/api/v1/agents/{id}/current` | Latest snapshot |
| GET | `/api/v1/agents/{id}/history?limit=60` | Ring buffer history |
| GET | `/api/v1/hub/config` | Hub UI settings |

## Alert webhook payload

```json
{
  "agentId": "server-01",
  "alertType": "CPU_HIGH",
  "message": "CPU load above threshold",
  "collectedAt": "2026-07-24T10:00:00Z",
  "details": { "cpuLoad": 0.95, "threshold": 0.90 }
}
```

Alert types: `CPU_HIGH`, `MEMORY_HIGH`, `CONTAINER_EXITED`, `CONTAINER_UNHEALTHY`.

## Local dev (single JVM)

```properties
metrics.hub.enabled=true
metrics.push.enabled=true
metrics.push.ingest-url=http://localhost:8080/api/v1/ingest
```

## Related

- [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) — MVP-2
- [`PHASE_GATES.md`](PHASE_GATES.md) — Phase 7 exit criteria
