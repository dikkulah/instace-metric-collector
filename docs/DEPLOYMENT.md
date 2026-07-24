# Deployment — Docker

Phase 5: containerized agent with optional dashboard and Docker host monitoring.

## Quick start

```bash
docker compose up -d --build
open http://localhost:8080
```

Or via Makefile:

```bash
make docker-up      # build + start detached
make docker-down    # stop
make docker-smoke   # build, run, health check, stop
```

## What runs where

| Mode | Host metrics | Container metrics |
|------|--------------|-------------------|
| `docker compose` (default) | Container cgroup view (`ps` inside container) | Via mounted Docker socket |
| JAR on host (`make run`) | Full host OS metrics | Local Docker socket |

Container deploy is best for **Docker socket monitoring** and **dashboard access**. For full host process/service lists, run the JAR directly on the host OS.

## Docker socket mount

`docker-compose.yml` mounts the host socket read-only:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
environment:
  DOCKER_HOST: unix:///var/run/docker.sock
```

**macOS (Docker Desktop):** set before `docker compose up`:

```bash
export DOCKER_SOCKET="$HOME/.docker/run/docker.sock"
docker compose up -d --build
```

**Linux:** default `/var/run/docker.sock` works.

The compose file runs as `user: "0:0"` because the Docker socket is typically root-owned. For stricter setups, use `group_add` with the host `docker` GID instead.

## Headless mode (no UI)

```bash
METRICS_UI_ENABLED=false docker compose up -d
```

Agent continues JSON logging; web controllers and static dashboard are disabled (V18).

## Environment variables

| Variable | Default | Maps to |
|----------|---------|---------|
| `METRICS_PORT` | `8080` | Host port mapping |
| `METRICS_COLLECTION_INTERVAL` | `60000` | `metrics.collection.interval` |
| `METRICS_UI_ENABLED` | `true` | `metrics.ui.enabled` |
| `METRICS_ACTUATOR_ENABLED` | `false` | `metrics.actuator.enabled` — K8s/Docker probes |
| `DOCKER_ENABLED` | `true` | `docker.enabled` |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Compose volume source |

## Image build

```bash
docker build -t instance-metric-collector:local .
```

Multi-stage: JDK 21 build → JRE 21 runtime with `procps` and `curl` (healthcheck).

## Healthcheck

Docker `HEALTHCHECK` calls `GET /api/metrics/config`. First metrics may take up to one collection interval after start.

## Logs

Inside the container, logs write to `/tmp/metrics-collector.log` (configurable via `LOGGING_FILE_NAME`). View with:

```bash
docker compose logs -f metrics-collector
```

## Related

- [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) — MVP-1
- [`PHASE_GATES.md`](PHASE_GATES.md) — Phase 5 exit criteria
