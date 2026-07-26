# Hub deployment (Phase 7 / MVP-2)

Central hub for multi-agent metrics and webhook alerts.

## Architecture

```
Agent (METRICS_PUSH_ENABLED=true)     Hub (METRICS_HUB_ENABLED=true)
        │                                      │
        └── POST /api/v1/ingest ──────────────►│ hub.Registry
                                               ├── GET /api/v1/agents
                                               ├── alert.Engine → webhook
                                               └── Hub UI (/hub)
```

ADR: [`DECISIONS/ADR-006-hub-topology.md`](DECISIONS/ADR-006-hub-topology.md)

## Hub server (Go env)

```bash
METRICS_HUB_ENABLED=true
SERVER_PORT=8080
METRICS_HUB_INGEST_TOKEN=change-me-in-production
METRICS_ALERTS_WEBHOOK_URL=https://hooks.slack.com/services/...
METRICS_ALERTS_CPU_THRESHOLD=90
METRICS_ALERTS_MEMORY_THRESHOLD=0.90
METRICS_ALERTS_DISK_THRESHOLD=90
METRICS_ALERTS_COOLDOWN=600000          # ms, default 10m
METRICS_ALERTS_STALE_MULTIPLIER=2.0       # stale after 2× collection interval
METRICS_HUB_OFFLINE_AFTER=24h             # offline after no push (default 24h)
METRICS_ALERTS_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
METRICS_ALERTS_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
METRICS_ALERTS_SMTP_HOST=smtp.example.com
METRICS_ALERTS_SMTP_PORT=587
METRICS_ALERTS_SMTP_USER=alerts@example.com
METRICS_ALERTS_SMTP_PASSWORD=secret
METRICS_ALERTS_SMTP_FROM=alerts@example.com
METRICS_ALERTS_SMTP_TO=ops@example.com,oncall@example.com
METRICS_ALERTS_SUSTAINED_WINDOW=5m          # CPU/memory avg window (0 = instant)
```

Env vars seed the initial threshold set on first hub start. After that, use **Hub → Alert thresholds** in the UI (`PUT /api/v1/hub/alert-config`). Values persist in `hub_settings` when `METRICS_HISTORY_ENABLED=true`.

```bash
make run-hub          # repo root
# or
make -C go run-hub
open http://localhost:8081/hub
```

## Operator UI (hub-first)

For multi-agent monitoring, use the **hub UI only**:

- Agent grid: `/hub`
- Per-agent dashboard, processes, services, containers: `/hub/agents/{agentId}/…`
- Alerts and threshold settings: `/hub`, `/alerts`

Local dev with hub + one push agent:

```bash
make dev
# → http://localhost:8081/hub
# Go: save .go → auto-rebuild when air is installed (go install github.com/air-verse/air@latest)
```

**Hot reload (UI + Go)** — React HMR on Vite:

```bash
make dev-watch
# → http://localhost:5173/hub   (Vite proxies API to :8081)
```

Single process with Go reload only:

```bash
make run-hub-watch   # hub only
make run-watch       # agent only
```

Agent local UI (`:8080`) remains optional for homelab and troubleshooting. In production with push enabled, prefer `METRICS_UI_ENABLED=false` on agents (see [DEPLOYMENT.md](DEPLOYMENT.md)).

## Agent push (Go env)

On each host running the agent:

```bash
METRICS_PUSH_ENABLED=true
METRICS_PUSH_INGEST_URL=http://hub-host:8080/api/v1/ingest
METRICS_PUSH_AGENT_ID=my-server-01      # optional; defaults to hostname
METRICS_PUSH_AUTH_TOKEN=change-me-in-production
METRICS_PUSH_TIMEOUT=5000                 # ms, default 5s
METRICS_PUSH_MAX_RETRIES=3
SERVER_PORT=8081                          # avoid port clash with hub on same host
```

Agent continues JSON logging and optional local dashboard (`METRICS_UI_ENABLED`).

Ingest auth: `Authorization: Bearer <token>` or `X-Ingest-Token` header when `METRICS_HUB_INGEST_TOKEN` is set.

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ingest` | Agent payload ingest |
| GET | `/api/v1/agents` | Agent summaries (catalog + live); fields `status`, `firstSeen` |
| GET | `/api/v1/agents/{id}/current` | Latest snapshot (registry or SQLite fallback); `X-Agent-Status` header |
| GET | `/api/v1/agents/{id}/history?limit=60` | Ring buffer history |
| GET | `/api/v1/hub/config` | Hub UI settings (`staleAfterMs`, `offlineAfterMs`, `history` metadata) |
| GET | `/api/v1/hub/notification-config` | Notification channels status + SMTP (non-secret) |
| PUT | `/api/v1/hub/notification-config` | Update hub SMTP settings (when not env-locked) |
| DELETE | `/api/v1/alerts/silences?agentId=&ruleId=` | Revoke an active silence |
| PUT | `/api/v1/hub/alert-config` | Update thresholds (persisted when history enabled) |

## Alert webhook payload

```json
{
  "agentId": "server-01",
  "alertType": "CPU_HIGH",
  "severity": "warning",
  "message": "CPU load above threshold",
  "collectedAt": "2026-07-24T10:00:00Z",
  "details": { "cpuLoad": 0.95, "threshold": 0.90 }
}
```

Alert types: `CPU_HIGH`, `MEMORY_HIGH`, `DISK_HIGH`, `CONTAINER_EXITED`, `CONTAINER_UNHEALTHY`, `AGENT_STALE`.

## History store (G7)

```bash
METRICS_HISTORY_ENABLED=true
METRICS_HISTORY_DB_PATH=metrics-history.db
METRICS_HISTORY_PROFILE=full
METRICS_HISTORY_RETENTION_DAYS=30
```

API: `GET /api/v1/agents/{id}/history?from=&to=&limit=` (SQLite when `from`/`to` set)

Persistent agent catalog (`hub_agents`) keeps known agents visible after hub restart or push loss. See [ADR-014](DECISIONS/ADR-014-agent-catalog-offline.md).

## Hub APIs (G5.1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/hub/stats` | Ingest/alert counters |
| GET | `/api/v1/alerts` | Alert event history (`?status=OPEN|ACK|RESOLVED`) |
| POST | `/api/v1/alerts/{id}/resolve` | Manually resolve an OPEN or ACK alert |
| GET | `/api/v1/agents/{id}/diagnostics` | Diagnostic insights |

## Connectivity probes (Phase 13)

```bash
METRICS_PROBE_TARGETS=api.internal:443,https://example.com/health
METRICS_PROBE_TIMEOUT=3s
```

See [ADR-010](DECISIONS/ADR-010-connectivity-probes.md).

Cooldown: same `agentId` + `alertType` is deduplicated for `METRICS_ALERTS_COOLDOWN` (default 10 minutes).

## Local dev (hub + agent on one machine)

Terminal 1 — hub:

```bash
METRICS_HUB_INGEST_TOKEN=dev \
METRICS_ALERTS_WEBHOOK_URL=http://localhost:9999/hook \
make run-hub
```

Terminal 2 — agent:

```bash
METRICS_PUSH_ENABLED=true \
METRICS_PUSH_INGEST_URL=http://localhost:8081/api/v1/ingest \
METRICS_PUSH_AUTH_TOKEN=dev \
METRICS_PUSH_AGENT_ID=local-agent \
SERVER_PORT=8080 \
make run-agent
```

## Related

- [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) — MVP-2
- [`PHASE_GATES.md`](PHASE_GATES.md) — Phase 7 exit criteria
- [`GO_REWRITE_PLAN.md`](GO_REWRITE_PLAN.md) — Phase G5
