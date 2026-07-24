# Go runtime (Phase G)

Strangler rewrite of the Java agent + hub. See [`docs/GO_REWRITE_PLAN.md`](../docs/GO_REWRITE_PLAN.md) and [ADR-008](../docs/DECISIONS/ADR-008-go-rewrite.md).

## Requirements

- Go 1.22+

## Quick start

```bash
# from repo root
make go-build
make go-test
METRICS_COLLECTION_INTERVAL=5000 make go-run   # Ctrl+C to stop
```

## Layout

```
cmd/agent/     per-host collector (G0 heartbeat → G1+ metrics)
cmd/hub/       central hub (G5+)
internal/
  config/      env vars (Spring Boot parity)
  runtime/     lifecycle + heartbeat (G0)
```

## Environment

| Variable | Default | Java equivalent |
|----------|---------|-----------------|
| `SERVER_PORT` | `8080` | `server.port` |
| `METRICS_COLLECTION_INTERVAL` | `60000` (ms) | `metrics.collection.interval` |
| `METRICS_UI_ENABLED` | `true` | `metrics.ui.enabled` |
| `DOCKER_ENABLED` | `true` | `docker.enabled` |
| `METRICS_HUB_ENABLED` | `false` | `metrics.hub.enabled` |

## UI sync (G4+)

```bash
make sync-ui   # copies src/main/resources/static → go/ui/static
```
