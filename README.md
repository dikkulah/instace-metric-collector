# instance-metric-collector (Outpost)

**Self-hosted host and Docker monitoring** for small teams, homelabs, and MSPs. A lightweight Go agent runs on each machine; an optional central **hub** aggregates metrics, stores history, and drives alerts.

> **Design principle:** the agent must not strain the host it monitors. Heavy work — history, rollups, sustained alerts, diagnostics — runs on the hub, not on every agent. See [ADR-013](docs/DECISIONS/ADR-013-agent-lightness.md).

---

## What you get

| Capability | Agent (per host) | Hub (central) |
|------------|------------------|---------------|
| CPU, memory, disk, network | ✓ | receives via push |
| Process & service lists | ✓ | displays per agent |
| Docker containers (optional) | ✓ | displays per agent |
| Live dashboard | optional local UI | **recommended** `/hub` |
| Metric history (SQLite) | — | ✓ 30-day retention |
| Alerts (webhook + Slack) | — | ✓ with silence rules |
| Offline agent catalog | — | ✓ agents stay visible after push stops |
| Push spool (hub unreachable) | ✓ overflow to disk | — |

---

## Architecture

### Deployment topology

```
┌─────────────────────────┐         HTTPS JSON          ┌──────────────────────────────┐
│  outpost-agent          │  POST /api/v1/ingest        │  outpost-hub                 │
│  (one per host)         │ ──────────────────────────► │  + embedded React dashboard  │
│                         │  Bearer / X-Ingest-Token    │                              │
│  • collectors (OS)      │                             │  • agent registry (RAM)        │
│  • optional local UI    │                             │  • hub_agents catalog (SQLite)│
│  • push client + spool  │                             │  • raw_samples history        │
└─────────────────────────┘                             │  • alert engine + webhooks   │
                                                        └──────────────────────────────┘
```

### Data flow (one collection tick)

```
METRICS_COLLECTION_INTERVAL (default 60s)
    │
    ├─► collector.Collect()     CPU, memory, disk, network, processes, services
    ├─► docker.Cached()           optional container metrics (separate ticker)
    ├─► store.Push()            in-memory snapshot (if UI enabled)
    ├─► logoutput.Write()       JSON line to metrics-collector.log
    └─► pushClient.Enqueue()      async POST to hub (if METRICS_PUSH_ENABLED)
            │
            └─► hub ingest ──► registry + async SQLite write + alert evaluation
```

### Where data lives

| Data | Location | Survives hub restart? |
|------|----------|------------------------|
| Live snapshot | Hub registry (RAM) | No — rehydrated from catalog summary |
| Agent identity | `hub_agents` table | **Yes** |
| Metric history | `raw_samples` table | **Yes** |
| Hourly/daily rollups | SQLite rollup tables | **Yes** |
| Alert events | `alert_events` table | **Yes** |
| Agent push queue | Memory → `push-spool.db` overflow | **Yes** (agent-side) |

The agent does **not** keep long-term history. If the hub is down, the agent buffers samples in memory and spills to a local SQLite spool; entries are deleted after a successful push.

### Agent connection status

The hub computes each agent's status from `lastSeen`:

| Status | Meaning |
|--------|---------|
| **Live** | Pushed within the stale window (default 2× collection interval) |
| **Stale** | No push recently, but within offline window |
| **Offline** | No push for `METRICS_HUB_OFFLINE_AFTER` (default 24h) |

Offline agents remain in the hub grid and sidebar. Opening one auto-switches to **History** mode so you can browse the last known data.

---

## Quick start

### Prerequisites

- Go 1.22+
- Node 20+ (only for UI development)
- Optional: Docker (for container metrics)

```bash
make onboard    # install deps + git hooks
make doctor     # verify Go, Node, Docker
```

### Single host (agent + local dashboard)

```bash
make run
# → http://localhost:8080
```

### Hub + agent (recommended for multi-host)

**Terminal 1 — hub:**

```bash
METRICS_HUB_INGEST_TOKEN=dev \
METRICS_HISTORY_ENABLED=true \
make run-hub
# → http://localhost:8081/hub
```

**Terminal 2 — agent pushing to hub:**

```bash
METRICS_PUSH_ENABLED=true \
METRICS_PUSH_INGEST_URL=http://localhost:8081/api/v1/ingest \
METRICS_PUSH_AUTH_TOKEN=dev \
SERVER_PORT=8082 \
make run
```

**Hot reload (UI + Go):**

```bash
make dev-watch
# → http://localhost:5173/hub  (Vite proxies API to :8081)
```

---

## Using the dashboard

### Hub overview (`/hub`)

- Grid of all known agents with CPU, memory, and container counts
- Filter: **All · Live · Offline**
- Configure alert thresholds (CPU, memory, disk, stale multiplier)
- Offline agents appear dimmed but remain clickable

### Per-agent views (`/hub/agents/{id}/…`)

| Page | Live mode | History mode |
|------|-----------|--------------|
| Dashboard | Real-time gauges and charts | Point-in-time snapshot at selected timestamp |
| Processes | Current top processes | Historical process table |
| Services | launchctl / systemctl status | Historical service list |
| Containers | Docker stats | Historical container metrics |
| Diagnostics | Rule-based insights | Same insights from store |
| Alerts | Firing and acknowledged events | — |

Toggle **Live | History** in the header. Offline agents open in History automatically with a **Last data** banner.

### Alerts (`/alerts`)

- View open, acknowledged, and resolved alert events
- Acknowledge alerts from the UI
- **Silence** a rule for an agent (temporary mute)
- Notifications fan out to generic webhook and/or Slack (`METRICS_ALERTS_SLACK_WEBHOOK_URL`)

---

## Configuration reference

### Agent (essential)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SERVER_PORT` | `8080` | HTTP port (local UI + API) |
| `METRICS_COLLECTION_INTERVAL` | `60000` | Collection period (ms) |
| `METRICS_UI_ENABLED` | `true` | Local REST/SSE dashboard |
| `DOCKER_ENABLED` | `true` | Docker collector (`false` = skip) |
| `METRICS_PUSH_ENABLED` | `false` | Push snapshots to hub |
| `METRICS_PUSH_INGEST_URL` | — | Hub ingest URL |
| `METRICS_PUSH_AUTH_TOKEN` | — | Must match hub ingest token |
| `METRICS_PUSH_SPOOL_PATH` | `push-spool.db` | Disk overflow when hub is down |
| `METRICS_PUSH_SPOOL_MAX` | `2880` | Max spooled samples (~48h at 60s) |

### Hub (essential)

| Variable | Default | Purpose |
|----------|---------|---------|
| `METRICS_HUB_ENABLED` | `false` | Run as central hub |
| `METRICS_HUB_INGEST_TOKEN` | — | Ingest authentication |
| `METRICS_HISTORY_ENABLED` | `false` | SQLite history + catalog |
| `METRICS_HISTORY_DB_PATH` | `metrics-history.db` | History database path |
| `METRICS_HISTORY_RETENTION_DAYS` | `30` | Raw sample retention |
| `METRICS_HUB_OFFLINE_AFTER` | `24h` | Mark agent offline |
| `METRICS_ALERTS_WEBHOOK_URL` | — | Generic alert webhook |
| `METRICS_ALERTS_SLACK_WEBHOOK_URL` | — | Slack incoming webhook |

Full lists: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/HUB.md`](docs/HUB.md)

---

## Project layout

```
go/
├── cmd/agent/           # per-host binary
├── cmd/hub/             # central hub binary
└── internal/
    ├── collector/       # OS-specific metrics (build tags)
    ├── docker/          # optional container cache
    ├── payload/         # MetricsPayload JSON contract
    ├── push/            # hub push client + spool
    ├── hub/             # in-memory registry + status model
    ├── history/         # SQLite store, rollups, agent catalog
    ├── alert/           # rules engine, webhook, Slack, silence
    ├── runtime/         # scheduler, lifecycle
    └── web/             # REST + SSE + embedded SPA

go/web/frontend/         # React 19 + Vite + TypeScript + Tailwind
docs/                    # architecture, ADRs, deployment guides
tool/                    # install scripts, dev watchers
```

---

## Development

| Command | Description |
|---------|-------------|
| `make help` | All targets |
| `make test` | Go unit tests |
| `make ci-fast` | Daily validation |
| `make ci-smoke` | Pre-merge smoke run |
| `make build` | agent + hub binaries (UI embedded) |
| `make run` | Agent + local UI |
| `make run-hub` | Hub mode |
| `make run-hub-watch` | Hub with Go hot reload (air) |
| `make run-agent-watch` | Agent with Go hot reload |
| `make dev-watch` | Hub + agent + Vite HMR |
| `make docker-up` | Docker Compose stack |

Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md)  
Agent/council rules: [`AGENTS.md`](AGENTS.md)

---

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| G0–G4 | Go agent/hub, collectors, REST/SSE, React SPA | Done |
| G5 | Hub push client, ingest, multi-agent UI | Done |
| G6 | Docker deploy (Go image) | Done |
| G7 | Historic store, rollups, alerts, offline catalog | Done |
| G8+ | Windows collector parity, normalized process samples | Planned |

Details: [`docs/GO_REWRITE_PLAN.md`](docs/GO_REWRITE_PLAN.md) · [`docs/HISTORY_ALERTS_DIAGNOSTICS_PLAN.md`](docs/HISTORY_ALERTS_DIAGNOSTICS_PLAN.md)

---

## Tech stack

- **Runtime:** Go 1.22+
- **UI:** React 19, Vite, TypeScript, Tailwind CSS
- **Storage:** SQLite (hub history, agent push spool)
- **Collectors:** gopsutil, launchctl (macOS), systemctl (Linux)
- **Docker:** moby client (optional)

---

## License

MIT — see [`LICENSE`](LICENSE) if present.
