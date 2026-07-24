# Tech debt

| ID | Area | Description | Priority |
|----|------|-------------|----------|
| TD-001 | HTTP | ~~`metrics.api.endpoint` unused~~ — push via `metrics.push.*` (Phase 7) | Resolved |
| TD-002 | Mac | `MacMetricsCollector` inlines process/service logic; `MacProcessCollector` / `MacServiceCollector` unused | Low |
| TD-003 | Logging | Mixed Apache Commons Logging and SLF4J across classes | Low |
| TD-004 | Payload | ~~Disk/network not in payload~~ — Phase 6 complete | Resolved |
| TD-005 | Actuator | ~~Endpoints not configured~~ — Phase 4 complete | Resolved |
| TD-007 | Docs | ~~No Dockerfile yet~~ — Phase 5 complete | Resolved |
| TD-008 | UI | ~~No dashboard yet~~ — Phase 3 complete | Resolved |

## Resolved

| ID | Resolution |
|----|------------|
| TD-006 | Qodana removed (`qodana.yaml`, workflow) |
| TD-007 | Dockerfile + docker-compose (`docs/DEPLOYMENT.md`) |
| TD-008 | Dashboard UI (Phase 3) |
| TD-004 | Disk/network in `MetricsPayload` (ADR-005) |
| TD-001 | Hub push via `metrics.push.ingest-url` (ADR-006) |
| TD-005 | Actuator gated by `metrics.actuator.enabled` (ADR-007) |
| — | Farabi dev structure (Makefile, tool/, docs/, Council) added |
