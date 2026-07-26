# Architecture

## Overview

`instance-metric-collector` is a single-process Go agent (or hub) that collects host metrics on a schedule, writes JSON `MetricsPayload` lines to a log file, and optionally serves a React dashboard via REST/SSE.

## Layout

```
go/
├── cmd/agent/          # per-host collector + optional UI
├── cmd/hub/            # central hub (agent registry + ingest)
└── internal/
    ├── config/         # env-based settings (Spring Boot parity)
    ├── runtime/        # scheduler loop, lifecycle
    ├── collector/      # OS-specific metrics (GOOS build tags)
    ├── docker/         # optional container collector + cache
    ├── payload/        # MetricsPayload contract
    ├── store/          # in-memory snapshot ring
    ├── web/            # REST + SSE + container proxy
    ├── webui/          # embedded React SPA (build output in dist/)
    ├── logoutput/      # JSON log file writer
    └── hub/            # agent registry (hub mode)
```

Frontend source: `go/web/frontend/` (Vite + React + TypeScript).

## Patterns

### OS collectors (V1)

Platform logic lives under `internal/collector/` with `//go:build` tags (`darwin`, `linux`, `windows`). The scheduler never shells out directly.

### Docker cache (optional, V4)

`internal/docker` refreshes container metadata on its own ticker and exposes `Cached()` to the main loop. `DOCKER_ENABLED=false` skips Docker client setup.

### Snapshot store (V16)

`internal/store` holds the latest metrics for REST/SSE. UI never parses log files.

## Scheduling flow

```
runtime.Run (ticker: METRICS_COLLECTION_INTERVAL)
    → collector.Collect()        # CPU, memory, processes, services, disk, network
    → docker.Cached()            # optional containers
    → store.Push(snapshot)       # if UI enabled
    → logoutput.Write(payload)   # JSON line to LOGGING_FILE_NAME
```

## Output contract

`MetricsPayload` fields (see `go/internal/payload/types.go`):

| Field | Type | Source |
|-------|------|--------|
| `cpuLoad` | float64 | gopsutil |
| `usedMemory` | int64 | gopsutil |
| `totalMemory` | int64 | gopsutil |
| `processInfos` | array | gopsutil + OS services |
| `serviceInfos` | array | launchctl / systemctl |
| `containers` | array | Docker cache |
| `diskUsage` | array | gopsutil |
| `networkUsage` | array | gopsutil |

JSON log output and REST payload share the same schema (V6, V7). Breaking changes require an ADR.

## Configuration

Environment variables (see `internal/config/config.go`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `SERVER_PORT` | `8080` | HTTP listen port |
| `METRICS_COLLECTION_INTERVAL` | `60000` (ms) | Main loop interval |
| `METRICS_UI_ENABLED` | `true` | REST/SSE + embedded SPA |
| `DOCKER_ENABLED` | `true` | Container collector |
| `DOCKER_COLLECTION_INTERVAL` | `15000` (ms) | Docker refresh interval |
| `LOGGING_FILE_NAME` | `metrics-collector.log` | JSON payload log file |
| `METRICS_PROBE_MAX_TARGETS` | `16` | Cap connectivity probes per tick (V21) |
| `METRICS_HUB_ENABLED` | `false` | Use `cmd/hub` instead of agent |

## Agent footprint (V21, ADR-013)

The agent collect loop must stay **non-blocking** and **bounded**:

- Process list: top **50** by CPU (`internal/collector/processes.go`)
- Connectivity probes: max **16** targets per tick (`METRICS_PROBE_MAX_TARGETS`)
- In-memory history ring: **120** snapshots when UI enabled
- Docker metadata: separate goroutine + cache (V5)
- Push to hub: async queue (`internal/push`)

Heavy work (SQLite history, rollup, alert engine, sustained rules, diagnostics trends) runs on **hub only**.

Optional self-metrics on each payload (additive): `agentMemoryBytes`, `agentGoroutines`, `collectDurationMs`.

See [`DECISIONS/ADR-013-agent-lightness.md`](DECISIONS/ADR-013-agent-lightness.md).

## Hub mode

`cmd/hub` exposes ingest (`POST /api/v1/ingest`) and agent listing. Agents push snapshots when `metrics.push.*` is wired (G5 backlog).

See [`docs/HUB.md`](HUB.md) and [ADR-006](DECISIONS/ADR-006-hub-topology.md).
