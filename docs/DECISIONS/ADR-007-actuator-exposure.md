# ADR-007: Actuator health exposure (Phase 4)

## Status

Accepted — Phase 4 (V13)

## Context

Spring Boot Actuator is on the classpath (TD-005) but web endpoints were implicitly exposed. Operators need Kubernetes/Docker liveness and readiness probes without using the human dashboard API (V16).

## Decision

Gate Actuator **web** exposure behind `metrics.actuator.enabled` (default `false`).

When enabled, `ActuatorEnabledConfiguration` loads `actuator-enabled.properties`:

| Endpoint | Purpose |
|----------|---------|
| `GET /actuator/health` | Aggregate health |
| `GET /actuator/health/liveness` | Process alive (K8s liveness) |
| `GET /actuator/health/readiness` | Ready to serve (K8s readiness) |

Configuration (`actuator-enabled.properties`):

- `management.endpoints.web.exposure.include=health` only
- `management.endpoint.health.probes.enabled=true`
- `management.endpoint.health.show-details=never`
- `management.endpoint.health.show-components=never`

`CollectorHealthIndicator` reports UP when the OS `MetricsCollector` bean is wired.

When disabled: `management.endpoints.web.exposure.exclude=*` — no actuator HTTP endpoints.

## Security review

| Risk | Mitigation |
|------|------------|
| Env/metrics leak via `/env`, `/beans` | Not exposed; health only |
| Payload/process data in health | `show-details=never` on public health; collector name only in component detail (hidden from anonymous) |
| Unauthenticated ops surface | Off by default; enable only on orchestrated deploys |
| Confusion with dashboard | Dashboard = `/`, `/api/metrics/*`; Actuator = `/actuator/health*` only |

## Consequences

- Docker `HEALTHCHECK` may use `/actuator/health` when actuator enabled; default image keeps `/api/metrics/config`.
- Smoke test optionally probes actuator when `METRICS_ACTUATOR_ENABLED=true`.
