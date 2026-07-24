# Actuator probes (Phase 4)

Ops health endpoints for Docker/Kubernetes — distinct from the human dashboard (`/`).

ADR: [`DECISIONS/ADR-007-actuator-exposure.md`](DECISIONS/ADR-007-actuator-exposure.md)

## Enable

```properties
metrics.actuator.enabled=true
```

Restart the app, then:

```bash
curl -fsS http://localhost:8080/actuator/health
curl -fsS http://localhost:8080/actuator/health/liveness
curl -fsS http://localhost:8080/actuator/health/readiness
```

Default is **disabled** — no `/actuator/*` HTTP endpoints.

## Kubernetes example

```yaml
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  initialDelaySeconds: 60
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  initialDelaySeconds: 30
```

Set env `METRICS_ACTUATOR_ENABLED=true` or `metrics.actuator.enabled=true` in the pod spec.

## Docker Compose

```yaml
environment:
  METRICS_ACTUATOR_ENABLED: "true"
healthcheck:
  test: ["CMD", "curl", "-fsS", "http://localhost:8080/actuator/health"]
```

## vs dashboard API

| Use case | URL |
|----------|-----|
| Human metrics UI | `/` |
| App metrics JSON | `/api/metrics/current` |
| Orchestrator probe | `/actuator/health/liveness` |

Do not use the dashboard or ingest APIs as container health checks.

## Related

- [`DEPLOYMENT.md`](DEPLOYMENT.md) — container deploy
- [`PHASE_GATES.md`](PHASE_GATES.md) — Phase 4 exit criteria
