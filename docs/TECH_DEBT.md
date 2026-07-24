# Tech debt

| ID | Area | Description | Priority |
|----|------|-------------|----------|
| TD-009 | Go | Hub push client (`metrics.push.*`) not wired in agent | Medium (G5) |
| TD-010 | Go | Windows collector is stub — no process/service parity | Medium |
| TD-011 | Go | Webhook alerts not ported from Java hub | Low (G7) |
| TD-012 | Go | Golden tests cover fixture only — no live Java byte compare | Low |
| TD-013 | Docs | Some phase-gate docs still reference Java paths | Low |

## Resolved

| ID | Resolution |
|----|------------|
| TD-001 | Hub push design documented (ADR-006); Go push pending G5 |
| TD-002 | Java Mac collector split — N/A after Java removal |
| TD-003 | Java mixed logging — N/A after Java removal |
| TD-004 | Disk/network in `MetricsPayload` (ADR-005) |
| TD-005 | Actuator gated (Java); Go has no actuator yet (V13) |
| TD-006 | Qodana removed |
| TD-007 | Dockerfile + docker-compose (Go multi-stage) |
| TD-008 | Dashboard UI — React SPA in `go/web/frontend` |
