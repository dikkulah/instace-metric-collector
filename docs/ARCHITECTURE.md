# Architecture

## Overview

`instance-metric-collector` is a single-process Spring Boot background agent. It collects host metrics on a schedule and writes a JSON `MetricsPayload` to the log file. Phase 3 will add an optional embedded dashboard (REST/SSE + static HTML); today there is no metrics API or UI.

## Package map

```
org.dikkulah.instancemetriccollector/
├── InstanceMetricCollectorApplication.java   # @EnableScheduling
├── config/                                   # Spring beans, OS conditions, Docker client
├── model/                                    # Records: MetricsPayload, ProcessInfo, ...
└── service/
    ├── InstanceMetricsSender.java            # Scheduled orchestration
    └── collector/
        ├── MetricsCollector.java             # Strategy interface
        ├── AbstractMetricsCollector.java     # JMX common metrics
        ├── linux/, mac/, windows/              # OS-specific implementations
        └── docker/                           # Optional container collector

# Phase 3 (planned) — web/
    ├── MetricsSnapshotStore.java             # In-memory latest + history
    ├── MetricsController.java                # REST + SSE
    └── resources/static/                     # Dashboard HTML/CSS/JS
```

## Patterns

### Strategy + Template Method

- `MetricsCollector` defines the contract for all platforms.
- `AbstractMetricsCollector` provides JMX-based CPU/memory via `OperatingSystemMXBean`.
- Each OS package implements process/service collection with platform shell commands.

### Conditional primary bean

`MetricsCollectorConfig` marks the OS-matching collector as `@Primary` using `OperatingSystemCondition`.

### Docker cache (optional)

`DockerContainerCollector` runs on its own schedule and maintains an in-memory cache. `InstanceMetricsSender` reads the cache so the main loop is never blocked by Docker API calls.

`@ConditionalOnProperty(name = "docker.enabled")` — when false, no Docker beans are created and the app starts normally.

## Scheduling flow

```
@Scheduled (metrics.collection.interval)
    InstanceMetricsSender.sendMetrics()
        → MetricsCollector (CPU, memory, processes, services)
        → DockerContainerCollector.getCachedContainers() [optional]
        → MetricsPayload
        → ObjectMapper.writeValueAsString → log.info

@Scheduled (docker.collection.interval)  [if docker.enabled]
    DockerContainerCollector.collectContainers()
        → Docker API → update cache
```

## Output contract

`MetricsPayload` record fields:

| Field | Type | Source |
|-------|------|--------|
| `cpuLoad` | double | JMX |
| `usedMemory` | long | totalMemory - freeMemory |
| `totalMemory` | long | JMX |
| `processInfos` | List | OS shell (`ps`, `tasklist`, …) |
| `serviceInfos` | List | OS shell (`systemctl`, `launchctl`, `sc`) |
| `containers` | List | Docker cache (empty if disabled) |

JSON log output is the external contract (V6, V7). Breaking changes require an ADR and version bump.

## Configuration

All intervals and feature flags are in `application.properties`:

- `metrics.collection.interval` — main loop (default 60000 ms)
- `docker.enabled` — enable/disable Docker beans
- `docker.collection.interval` — Docker cache refresh (default 15000 ms)
- `docker.host` — optional; auto-detects common socket paths

## Extension points (phase-gated)

| Feature | Phase | Status |
|---------|-------|--------|
| JSON log output | 1 | Done |
| HTTP push to `metrics.api.endpoint` | 2 | Prepared (`RestTemplate` injected, not wired) |
| Metrics dashboard UI (REST/SSE + static) | 3 | Planned — [`UI_PLAN.md`](UI_PLAN.md) |
| Actuator health endpoints | 4 | Dependency present, not exposed |
| Dockerfile / deployment | 5 | Planned |
| Disk/network in payload | 6 | Interface exists on macOS only |

See [`PHASE_GATES.md`](PHASE_GATES.md).

## Testing

- **Unit tests**: Mockito for `InstanceMetricsSender`, Docker collector mapping
- **Smoke test**: `tool/smoke_local.sh` — package JAR, run ~12s, assert JSON fields in log

See [`TESTING.md`](TESTING.md).
