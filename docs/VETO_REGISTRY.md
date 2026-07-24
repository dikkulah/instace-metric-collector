# Council veto registry (V1–V20)

Canonical list for agent veto scans. Rule files in `.cursor/rules/` map to these IDs.

| ID | Domain | Rule | Rule file |
|----|--------|------|-----------|
| V1 | Architecture | OS-specific logic only under `service/collector/{linux,mac,windows}/` | `metrics-collector-architecture.mdc` |
| V2 | Architecture | All platforms implement `MetricsCollector` interface | `metrics-collector-architecture.mdc` |
| V3 | Architecture | `ProcessBuilder`/shell calls stay in collector layer, not in `InstanceMetricsSender` | `metrics-collector-architecture.mdc` |
| V4 | Docker | App starts without Docker beans when `docker.enabled=false` | `metrics-collector-docker.mdc` |
| V5 | Docker | Container collection does not block main loop (cache + separate schedule) | `metrics-collector-docker.mdc` |
| V6 | Payload | `MetricsPayload` fields remain backward compatible (breaking = ADR + version) | `metrics-collector-payload.mdc` |
| V7 | Payload | JSON log output is external contract — schema changes documented | `metrics-collector-payload.mdc` |
| V8 | Config | Schedule intervals configurable via `application.properties` | `metrics-collector-architecture.mdc` |
| V9 | Security | No credentials committed to repo | `metrics-collector-security.mdc` |
| V10 | Security | No secrets written to logs | `metrics-collector-security.mdc` |
| V11 | Resilience | Collector failures do not crash the app (empty list / warn) | `metrics-collector-architecture.mdc` |
| V12 | Phase | HTTP push (`metrics.api.endpoint`) not enabled without Phase 2 gate + user approval | `metrics-collector-phase-gates.mdc` |
| V13 | Phase | Actuator endpoint exposure not enabled without Phase 4 gate + user approval | `metrics-collector-phase-gates.mdc` |
| V14 | Testing | New collector logic requires unit test | `metrics-collector-architecture.mdc` |
| V15 | Repo | `target/`, `*.log`, `.DS_Store` never committed | `metrics-collector-security.mdc` |
| V16 | UI | Dashboard reads from `MetricsSnapshotStore`, not log file parsing | `metrics-collector-ui.mdc` |
| V17 | UI | UI/API layer must not block collector scheduler threads | `metrics-collector-ui.mdc` |
| V18 | UI | `metrics.ui.enabled=false` allows headless mode without web UI | `metrics-collector-ui.mdc` |
| V19 | Phase | Web dashboard not enabled without Phase 3 gate + user approval | `metrics-collector-phase-gates.mdc` |
| V20 | i18n | No hardcoded user-visible strings in dashboard HTML/JS — use locale JSON keys | `metrics-collector-ui.mdc` |

## Scan policy

Before implementing, check all applicable vetoes. Stop and ask the user if any would be violated.

See `docs/PHASE_GATES.md` for phase boundaries.
