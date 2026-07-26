# Deployment — Docker

Go agent with optional dashboard and Docker host monitoring.

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
| `docker compose` (default) | Container cgroup view | Via mounted Docker socket |
| Binary on host (`make run`) | Full host OS metrics | Local Docker socket |

Container deploy is best for **Docker socket monitoring** and **dashboard access**. For full host process/service lists, run the agent binary directly on the host OS.

## Docker socket mount

`docker-compose.yml` mounts the host socket read-only:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
environment:
  DOCKER_HOST: unix:///var/run/docker.sock
```

**macOS (Docker Desktop):**

```bash
export DOCKER_SOCKET="$HOME/.docker/run/docker.sock"
docker compose up -d --build
```

**Linux:** default `/var/run/docker.sock` works.

The compose file runs as `user: "0:0"` because the Docker socket is typically root-owned.

## Headless mode (no UI)

```bash
METRICS_UI_ENABLED=false docker compose up -d
```

Agent continues JSON logging; HTTP dashboard is disabled (V18).

### Push agents (hub deployment)

When an agent pushes to a central hub (`METRICS_PUSH_ENABLED=true`), disable the local HTTP UI in production:

```bash
METRICS_PUSH_ENABLED=true
METRICS_PUSH_INGEST_URL=http://hub-host:8081/api/v1/ingest
METRICS_UI_ENABLED=false
```

Operators use the hub UI at `/hub` instead of per-host dashboards. Keep `METRICS_UI_ENABLED=true` only for on-host debugging or homelab single-node setups.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `METRICS_PORT` | `8080` | Host port mapping |
| `METRICS_COLLECTION_INTERVAL` | `60000` | Collection interval (ms) |
| `METRICS_UI_ENABLED` | `true` | Embedded dashboard |
| `DOCKER_ENABLED` | `true` | Container collector |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Compose volume source |
| `METRICS_HUB_INGEST_TOKEN` | (empty) | Hub: require token on `POST /api/v1/ingest` |
| `METRICS_PUSH_AUTH_TOKEN` | (empty) | Agent: `Authorization: Bearer` or hub token match |

When `METRICS_HUB_INGEST_TOKEN` is set on the hub, agents must send the same value via `METRICS_PUSH_AUTH_TOKEN` (Bearer header) or `X-Ingest-Token`. Requests without a valid token receive HTTP 401.

## Agent install script

One-line install from a GitHub release (or local binary for dev):

```bash
chmod +x tool/install_agent.sh
./tool/install_agent.sh --version v0.1.0 \
  --hub-url http://hub-host:8081/api/v1/ingest \
  --token "$METRICS_HUB_INGEST_TOKEN" \
  --agent-id my-server
```

User-local install (no root, no systemd):

```bash
./tool/install_agent.sh --local go/dist/outpost-agent_linux-amd64 --user \
  --hub-url http://localhost:8081/api/v1/ingest --token secret
```

Config is written to `/etc/outpost-agent/agent.env` (or `~/.config/outpost-agent/agent.env` with `--user`).

## Image build

```bash
docker build -t instance-metric-collector:local .
```

Multi-stage: Node 22 (UI) → Go 1.22 build → Debian slim runtime with `curl` (healthcheck).

## Healthcheck

Docker `HEALTHCHECK` calls `GET /api/metrics/config`. First metrics may take up to one collection interval after start.

## Releases

Tagged releases (`v*`) build cross-platform binaries and publish the agent Docker image to GHCR.

### Binaries (GitHub Releases)

| Artifact | Platforms |
|----------|-----------|
| `outpost-agent_<os>-<arch>` | linux/amd64, linux/arm64, darwin/arm64, windows/amd64 |
| `outpost-hub_<os>-<arch>` | same |
| `checksums.txt` | SHA256 for all binaries |

Local build:

```bash
make -C go release VERSION=v0.1.0-test
ls go/dist/
```

Windows artifacts use `.exe` suffix. Binaries embed the React UI (`ui-sync-dist` runs automatically).

### Container image (GHCR)

On tag push, CI publishes:

```
ghcr.io/<owner>/<repo>:<tag>
ghcr.io/<owner>/<repo>:latest
```

Pull and run (agent):

```bash
docker pull ghcr.io/<owner>/<repo>:latest
docker run -p 8080:8080 -v /var/run/docker.sock:/var/run/docker.sock:ro ghcr.io/<owner>/<repo>:latest
```

Replace `<owner>/<repo>` with your GitHub repository path (lowercase).

## Logs

Payload JSON lines write to `LOGGING_FILE_NAME` (default `metrics-collector.log` in working directory). Structured startup logs go to stdout:

```bash
docker compose logs -f metrics-collector
```

## Related

- [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md)
- [`PHASE_GATES.md`](PHASE_GATES.md)
- [ADR-009](DECISIONS/ADR-009-java-removal.md) — Java removal
