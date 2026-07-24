# Go runtime

Primary agent + hub implementation. See [`docs/GO_REWRITE_PLAN.md`](../docs/GO_REWRITE_PLAN.md) and [ADR-008](../docs/DECISIONS/ADR-008-go-rewrite.md).

## Requirements

- Go 1.22+
- Node 22+ (UI build only)

## Quick start

```bash
# from repo root
make build
make test
make run          # agent + UI on :8080
make run-hub      # hub on :8081
```

## Layout

```
cmd/agent/     per-host collector
cmd/hub/       central hub
internal/
  collector/   OS metrics (GOOS build tags)
  docker/      optional container collector
  runtime/     scheduler loop
  web/         REST + SSE API
  webui/       embedded SPA (dist/ generated at build)
web/frontend/  React source (Vite)
```

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `SERVER_PORT` | `8080` | HTTP port |
| `METRICS_COLLECTION_INTERVAL` | `60000` (ms) | Main loop |
| `METRICS_UI_ENABLED` | `true` | Dashboard |
| `DOCKER_ENABLED` | `true` | Container metrics |
| `LOGGING_FILE_NAME` | `metrics-collector.log` | JSON payload log |
| `METRICS_HUB_ENABLED` | `false` | Use `cmd/hub` binary |

## UI build

```bash
make ui-install   # npm ci
make ui-build     # → go/internal/webui/dist
make build        # ui-build + compile binaries
make clean        # remove bin/, dist/, node_modules/
```
